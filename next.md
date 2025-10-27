Priority plan (quick summary)
	1.	Fix GitHub webhook so PRs are parsed and YAML changes are analyzed (delta cost / delta carbon calculated).
	2.	Improve AI fallback logic to use real resource diffs + buffer instead of hardcoded multipliers.
	3.	Make YAML patch generation robust by detecting real container names and multi-container pods.
	4.	Extend metrics collection beyond Deployments to StatefulSets, DaemonSets, CronJobs, etc.
	5.	Wire up “Apply Fix” button: frontend → backend API that returns YAML patch and instructions or opens PR.
	6.	Improve AI error handling: configurable timeout, retries, backoff and structured logging.
	7.	Implement additional opportunity types (scheduling, image-optimization) and show them on frontend.

I’ll now go through each item with code and tests.

⸻

1) GitHub Webhook Integration — analyze PR YAML changes and compute delta_cost/delta_carbon

Goal: When a PR modifies k8s manifests, parse changed files, extract resource request/limits differences, compute cost & carbon deltas using same cost model OpenCost uses.

High-level approach
	•	Receive pull_request webhook (opened/synchronize).
	•	Fetch changed files from GitHub API (PR files).
	•	For each changed file that’s YAML/manifest, parse YAML and extract workload specs (resources for containers).
	•	Compare before vs after: you’ll need to fetch base branch version of the file (GitHub contents API) or use the PR diff patch that includes both. Compute resource deltas (cpu_request, memory_request).
	•	Convert resource delta → monthly cost delta using the same cost_per_cpu_hour and cost_per_gb_hour constants used by OpenCost integration; convert energy → carbon using Kepler/carbon intensity mapping.
	•	Store delta_cost_usd and delta_carbon_gco2e in the DB and post a PR comment with summary.

Example webhook handler (FastAPI / Python)

# file: github_webhook.py
import os, hmac, hashlib, json, asyncio
from fastapi import FastAPI, Request, Header, HTTPException
import httpx
import yaml

app = FastAPI()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")

# cost model (example — align with OpenCost)
COST_PER_CPU_HOUR = 0.05   # USD per cpu core-hour
COST_PER_GB_HOUR = 0.01    # USD per GB-hour
HOURS_PER_MONTH = 24 * 30

async def verify_signature(request: Request, signature: str):
    body = await request.body()
    mac = hmac.new(WEBHOOK_SECRET.encode(), msg=body, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

def parse_resources_from_manifest(yaml_text):
    docs = list(yaml.safe_load_all(yaml_text))
    workloads = []
    for doc in docs:
        if not isinstance(doc, dict): continue
        kind = doc.get("kind")
        metadata = doc.get("metadata", {})
        spec = doc.get("spec", {})
        # handle PodTemplate spec paths for Deployments, StatefulSets
        template = spec.get("template") or spec.get("jobTemplate", {}).get("spec", {}).get("template")
        if template:
            containers = template.get("spec", {}).get("containers", [])
        else:
            # direct Pod manifest
            containers = spec.get("containers", [])
        for c in containers:
            name = c.get("name")
            res = c.get("resources", {})
            requests = res.get("requests", {})
            limits = res.get("limits", {})
            cpu_req = requests.get("cpu")
            mem_req = requests.get("memory")
            workloads.append({
                "kind": kind,
                "name": metadata.get("name"),
                "container": name,
                "cpu_request": cpu_req,
                "mem_request": mem_req
            })
    return workloads

def parse_cpu_to_cores(cpu_str):
    if cpu_str is None: return 0.0
    if isinstance(cpu_str, (int, float)): return float(cpu_str)
    cpu = cpu_str.strip()
    if cpu.endswith("m"):
        return float(cpu[:-1]) / 1000.0
    return float(cpu)

def parse_mem_to_gb(mem_str):
    if mem_str is None: return 0.0
    if isinstance(mem_str, (int, float)): return float(mem_str) / (1024**3)
    s = mem_str.strip().upper()
    if s.endswith("GI"):
        return float(s[:-2])
    if s.endswith("G"):
        return float(s[:-1])
    if s.endswith("MI"):
        return float(s[:-2]) / 1024.0
    if s.endswith("M"):
        return float(s[:-1]) / 1024.0
    if s.endswith("K"):
        return float(s[:-1]) / (1024.0**2)
    return float(s) / (1024**3)

def compute_cost_delta(cpu_delta_cores, mem_delta_gb):
    cpu_monthly = cpu_delta_cores * HOURS_PER_MONTH * COST_PER_CPU_HOUR
    mem_monthly = mem_delta_gb * HOURS_PER_MONTH * COST_PER_GB_HOUR
    return cpu_monthly + mem_monthly

@app.post("/github_webhook")
async def handle_webhook(request: Request, x_hub_signature_256: str = Header(None), x_github_event: str = Header(None)):
    await verify_signature(request, x_hub_signature_256)
    body = await request.json()
    if x_github_event not in ("pull_request",):
        return {"msg": "ignored event"}
    action = body.get("action")
    if action not in ("opened", "synchronize", "reopened"):
        return {"msg":"no-op"}
    pr = body["pull_request"]
    repo = body["repository"]
    owner = repo["owner"]["login"]
    repo_name = repo["name"]
    pr_number = pr["number"]

    # fetch PR files
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept":"application/vnd.github+json"}
    async with httpx.AsyncClient() as client:
        files_url = pr["url"] + "/files"
        files = []
        page = files_url
        while page:
            r = await client.get(page, headers=headers)
            r.raise_for_status()
            files.extend(r.json())
            # GitHub pagination via Link header
            link = r.headers.get("link", "")
            next_link = None
            for part in link.split(","):
                if 'rel="next"' in part:
                    next_link = part[part.find("<")+1:part.find(">")]
            page = next_link

    total_delta_cost = 0.0
    total_delta_carbon_g = 0.0
    # For each file changed: if yaml, compute before/after
    for f in files:
        filename = f["filename"]
        if not filename.endswith((".yml", ".yaml")):
            continue
        # fetch raw URL of base and head versions
        raw_url_before = f.get("raw_url")  # this is head; need base content via contents API
        # get base content
        blob_url = f.get("contents_url")
        # contents_url returns head by default; to get base, use GitHub API to fetch the file at base ref
        base_ref = body["pull_request"]["base"]["sha"]
        head_ref = body["pull_request"]["head"]["sha"]
        async with httpx.AsyncClient() as client:
            # base file
            r_base = await client.get(f"https://api.github.com/repos/{owner}/{repo_name}/contents/{filename}?ref={body['pull_request']['base']['ref']}", headers=headers)
            base_text = ""
            if r_base.status_code == 200:
                content = r_base.json().get("content", "")
                import base64
                base_text = base64.b64decode(content).decode()
            # head file
            r_head = await client.get(f"https://api.github.com/repos/{owner}/{repo_name}/contents/{filename}?ref={body['pull_request']['head']['ref']}", headers=headers)
            head_text = ""
            if r_head.status_code == 200:
                content = r_head.json().get("content", "")
                import base64
                head_text = base64.b64decode(content).decode()
        base_workloads = parse_resources_from_manifest(base_text)
        head_workloads = parse_resources_from_manifest(head_text)
        # naive mapping by container name; you may want smarter matching by workload name+container
        for b in base_workloads:
            for h in head_workloads:
                if b["container"] == h["container"] and b["name"] == h["name"]:
                    cpu_before = parse_cpu_to_cores(b["cpu_request"])
                    cpu_after = parse_cpu_to_cores(h["cpu_request"])
                    mem_before = parse_mem_to_gb(b["mem_request"])
                    mem_after = parse_mem_to_gb(h["mem_request"])
                    cpu_delta = cpu_after - cpu_before
                    mem_delta = mem_after - mem_before
                    delta_cost = compute_cost_delta(cpu_delta, mem_delta)
                    # carbon: approximate using 0.0004 kg CO2 per Wh per server — align to Kepler if available
                    # assume CPU + memory energy proxy:
                    energy_kwh = (cpu_delta * 50/1000.0) * HOURS_PER_MONTH  # example: 50W per core
                    carbon_kg = energy_kwh * 0.4  # 0.4 kgCO2e per kWh (configurable)
                    total_delta_cost += delta_cost
                    total_delta_carbon_g += carbon_kg * 1000.0

    # store in your Supabase DB or app DB (pseudocode)
    # db.insert_pr_analysis(pr_number=pr_number, repo=repo_name, delta_cost_usd=total_delta_cost, delta_carbon_gco2e=total_delta_carbon_g)
    # leave PR comment
    comment_body = f"Estimated monthly delta cost: ${total_delta_cost:.2f}\nEstimated monthly delta carbon: {total_delta_carbon_gco2e:.0f} gCO2e"
    # post comment
    async with httpx.AsyncClient() as client:
        await client.post(pr["comments_url"], json={"body": comment_body}, headers=headers)
    return {"status":"ok", "cost": total_delta_cost}

Notes / Improvements
	•	For large repos, use smarter mapping (workload name + container).
	•	Use OpenCost pricing endpoints if available rather than constants.
	•	Use Kepler data (if available) to convert resource utilization to energy more accurately.

Tests
	•	Create PR that increases cpu request from 100m → 200m. Confirm delta_cost_usd > 0 and plugin stores value.
	•	Confirm comment posted to PR with numbers.

⸻

2) AI Recommendation Fallback Logic (ai_advisor.py)

Problem: fallback uses workload_data['cpu_used'] * 2 and current_cost * 0.5 — both arbitrary.

Fix: compute a rightsizing suggestion from actual requests vs usage and apply a safe buffer (configurable, e.g., 1.25x). Compute savings from difference in requested resources (the resource that billing uses) multiplied by cost-per-hour.

Example logic

# ai_advisor.py snippet — fallback routine
DEFAULT_BUFFER = 1.25  # 25% buffer on top of observed peak usage
COST_PER_CPU_HOUR = 0.05
COST_PER_GB_HOUR = 0.01
HOURS_PER_MONTH = 24*30

def compute_rightsizing(workload_data):
    # workload_data should contain keys: cpu_request, mem_request, cpu_used_peak, mem_used_peak, current_cost
    cpu_req = parse_cpu_to_cores(workload_data.get("cpu_request", "0"))
    mem_req = parse_mem_to_gb(workload_data.get("mem_request", "0"))
    cpu_peak = float(workload_data.get("cpu_used_peak", 0.0))
    mem_peak = float(workload_data.get("mem_used_peak", 0.0))

    suggested_cpu = max(0.001, cpu_peak * DEFAULT_BUFFER)
    suggested_mem = max(0.001, mem_peak * DEFAULT_BUFFER)

    # only recommend reduction if suggested < current request by a threshold (e.g., 15%)
    cpu_reduction = 0.0
    mem_reduction = 0.0
    if suggested_cpu < cpu_req * 0.85:
        cpu_reduction = cpu_req - suggested_cpu
    if suggested_mem < mem_req * 0.85:
        mem_reduction = mem_req - suggested_mem

    monthly_saving = (cpu_reduction * COST_PER_CPU_HOUR + mem_reduction * COST_PER_GB_HOUR) * HOURS_PER_MONTH

    return {
        "suggested_cpu": suggested_cpu,
        "suggested_mem_gb": suggested_mem,
        "monthly_saving_usd": monthly_saving
    }

Why this is better
	•	Uses actual peak usage instead of arbitrary multipliers.
	•	Uses a configurable buffer to avoid recommending changes that will break workloads.
	•	Only recommends when there’s meaningful slack (>15% threshold).

⸻

3) YAML Patch Generation — detect real container names and multi-container pods

Problem: function assumes a single container named "main". Must parse manifest and generate patch(s) for the right containers.

Solution: parse the manifest to find containers, match by name, then produce strategic merge patch (or JSON patch) for the resource fields.

Example function (Python)

import yaml
from deepdiff import DeepDiff  # optional for debugging diffs

def generate_yaml_patch(original_yaml_text, suggested_resources):
    """
    original_yaml_text: YAML manifest string
    suggested_resources: dict keyed by (workload_name, container_name) -> {"cpu": "200m", "memory": "256Mi"}
    returns: patch dict (strategic merge patch)
    """
    doc = yaml.safe_load(original_yaml_text)
    # navigate to template.spec.containers for Deployments / StatefulSets
    # templates differ; generic approach:
    spec = doc.get("spec", {})
    template = spec.get("template")
    if template:
        containers = template.setdefault("spec", {}).setdefault("containers", [])
    else:
        containers = spec.setdefault("containers", [])
    for c in containers:
        cname = c.get("name")
        key = (doc.get("metadata", {}).get("name"), cname)
        if key in suggested_resources:
            # create or update resources.requests/limits in patch
            res = suggested_resources[key]
            c.setdefault("resources", {})
            c["resources"]["requests"] = {"cpu": res["cpu"], "memory": res["memory"]}
    patch = doc  # strategic merge patch is the document with only the fields you changed
    return yaml.safe_dump(patch)

Frontend: show patch and allow download or open PR.

Notes
	•	For safer operations, produce a kubectl apply --dry-run=server -f - sample that the user can run.
	•	Consider generating both strategic merge patch and JSON patch depending on the resource type.

⸻

4) Incomplete Metrics Collection — include StatefulSet, DaemonSet, CronJob, Jobs

Problem: collect_metrics only collects Deployments. We must collect other controller types and Pod-level metrics.

Solution: Use Kubernetes Python client to list the other workload types and capture metrics (requests/limits and usage if metrics server available).

Example (Python)

from kubernetes import client, config

def collect_workload_manifests(namespaces=None):
    config.load_kube_config()  # or in-cluster
    v1 = client.AppsV1Api()
    core = client.CoreV1Api()
    batch = client.BatchV1Api()

    namespaces = namespaces or ["default"]  # expand as needed

    workloads = []
    for ns in namespaces:
        # Deployments
        for d in v1.list_namespaced_deployment(ns).items:
            workloads.append(("Deployment", ns, d.metadata.name, d))
        # StatefulSets
        for s in v1.list_namespaced_stateful_set(ns).items:
            workloads.append(("StatefulSet", ns, s.metadata.name, s))
        # DaemonSets
        for ds in v1.list_namespaced_daemon_set(ns).items:
            workloads.append(("DaemonSet", ns, ds.metadata.name, ds))
        # Jobs / CronJobs (batch/v1)
        for j in batch.list_namespaced_job(ns).items:
            workloads.append(("Job", ns, j.metadata.name, j))
        # Note: CronJobs are batch/v1beta1 API in older clusters; handle both.
        try:
            for cj in batch.list_namespaced_cron_job(ns).items:
                workloads.append(("CronJob", ns, cj.metadata.name, cj))
        except Exception:
            pass
    return workloads

Usage
	•	For each workload, extract .spec.template.spec.containers[*].resources.
	•	For usage, query metrics API or Prometheus scraping kube_pod_container_resource_usage_seconds_total or container_cpu_usage_seconds_total counters.

Testing
	•	Run collect_workload_manifests and verify StatefulSets and DaemonSets discovered.

⸻

5) Frontend “Apply Fix” Button — implement action path

Problem: Button is visual only.

Solution: Wire it to call an API route that:
	•	returns YAML patch or a downloadable file,
	•	optionally opens a GitHub branch + creates a PR with the patch (requires GitHub PAT and a configured bot/user),
	•	or returns a kubectl snippet the user can run.

Example Next.js (app router) API route (TypeScript)

// file: app/api/apply-fix/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { manifest, suggested_resources, repo, create_pr } = body;
  // call backend function to create patch
  const patch = await fetch(`${process.env.BACKEND_URL}/generate_patch`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ manifest, suggested_resources })
  }).then(r => r.text());

  if (create_pr && repo) {
    // call backend to create branch, commit patch, open PR
    const pr_resp = await fetch(`${process.env.BACKEND_URL}/create_pr`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ repo, patch })
    }).then(r => r.json());
    return NextResponse.json({ success: true, pr: pr_resp });
  }

  // Otherwise return the patch for download
  return NextResponse.json({ success: true, patch });
}

Frontend (React)
	•	Apply Fix clicks call this route, then display PR link or download prompt.

Security
	•	Only trusted users should be allowed to create PRs / modify repo. Use GitHub App or bot PAT with limited scopes.

⸻

6) Error Handling in AI Module

Problem: Fixed 30s timeout, weak error info.

Solution
	•	Make timeout configurable via env var (e.g., AI_TIMEOUT_SECONDS).
	•	Implement exponential backoff retries (e.g., 3 attempts).
	•	Add structured logging for errors (request/response, job id).
	•	Return a structured fallback result when AI fails (and log full error internally).

Example (Python)

import time
import logging
import requests

AI_TIMEOUT = int(os.getenv("AI_TIMEOUT_SECONDS", "60"))
AI_RETRIES = int(os.getenv("AI_RETRIES", "3"))

def call_ai_model(payload):
    url = os.getenv("AI_ENDPOINT")
    last_exc = None
    delay = 1.0
    for attempt in range(AI_RETRIES):
        try:
            r = requests.post(url, json=payload, timeout=AI_TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last_exc = e
            logging.exception("AI request failed (attempt %d): %s", attempt+1, str(e))
            time.sleep(delay)
            delay *= 2
    # after retries, return structured fallback
    logging.error("AI failed after %d attempts. Returning fallback.", AI_RETRIES)
    return {"status":"fallback", "error": str(last_exc)}


⸻

7) Incomplete Opportunity Types — add scheduling & image-optimization analyses

Scheduling (basic checks)
	•	Detect workloads with restartPolicy: Always and tight node affinity not set — look for opportunities to use CronJobs for batch tasks.
	•	Suggest using node selectors / taints if workloads are non-critical.
	•	Suggested output: "type": "scheduling", "description": "...", "estimated_savings_usd": X, "estimated_carbon_gco2e": Y

Image-optimization
	•	Detect images bigger than X MB (pull image manifest size via container registry API if allowed).
	•	Recommend smaller base images (alpine) or multi-stage builds.
	•	Estimate memory/cpu savings conservatively (e.g., smaller images often reduce memory but not always) — mark as lower-confidence.

Pseudo code for adding opportunity types

def analyze_opportunities(workload):
    opps = []
    # rightsizing (existing)
    opps.extend(analyze_rightsizing(workload))
    # scheduling
    if is_batch_job(workload) and not using_cron(job):
        opps.append({"type":"scheduling", "desc":"Consider converting to CronJob / schedule to avoid idle nodes", "confidence":"medium"})
    # image optimization
    image_size_mb = get_image_size_from_registry(workload.image)
    if image_size_mb and image_size_mb > 200:
        opps.append({"type":"image-optimization", "desc": f"Image {workload.image} is {image_size_mb}MB, consider slimming", "estimated_savings_usd": 0.03})
    return opps

Frontend
	•	Update pie chart categories to include these types and ensure backend creates these opportunity type entries.

⸻

Tests & Validation (practical checks)
	•	Unit tests for CPU and memory parsing (m, Mi, Gi, etc.) — confirm 100m => 0.1 cores.
	•	Integration test: create a sample PR that increases resource requests; confirm webhook stores non-zero delta_cost_usd and delta_carbon_gco2e.
	•	End-to-end: On sample deployment with high unused resources, run AI fallback and confirm suggestions are sensible (suggested < request).
	•	Frontend test: click “Apply Fix” and confirm API returns patch and optionally creates PR.

⸻

Files / Functions to change (quick map)
	•	github_webhook.py — replace placeholder webhook logic with the above.
	•	ai_advisor.py — replace fallback with compute_rightsizing and optional structured fallback return.
	•	yaml_utils.py — add generate_yaml_patch that detects container names.
	•	metrics_collector.py — extend lists to StatefulSet/DaemonSet/Job/CronJob and query Prometheus for usage.
	•	frontend/app/(page).tsx and app/api/apply-fix/route.ts — wire up button to backend.
	•	opportunity_analyzer.py — extend to create scheduling and image-optimization opportunity types.
	•	CI tests: add test manifest fixtures and tests for parsing / diff / patch generation.

⸻

Quick checklists to deploy fixes safely
	•	Add feature flags or rollout in staging first (especially PR auto-comments to avoid noise).
	•	Log every PR analysis to DB so you can re-run later when logic changes.
	•	Make cost / carbon conversion factors configurable env vars.
	•	Add unit tests for all parsers and math (parse cpu/memory → cores/GB, cost math).
	•	Lock GitHub token to minimal scopes if you create PRs (repo contents / issues only) or use GitHub App.

⸻

If you want, I can:
	•	produce a ready-to-open PR patch for one of the specific files (pick one) with the exact diff,
	•	or generate unit tests for the cpu/memory parsers,
	•	or create the Next.js API + frontend code fully wired to an example backend endpoint.

Which of those would you like me to generate now?