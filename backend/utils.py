import yaml
from typing import Dict, Any

def parse_cpu_to_cores(cpu_str: str) -> float:
    """Convert Kubernetes CPU string to cores"""
    if cpu_str is None:
        return 0.0
    if isinstance(cpu_str, (int, float)):
        return float(cpu_str)
    cpu = str(cpu_str).strip()
    if cpu.endswith("m"):
        return float(cpu[:-1]) / 1000.0
    return float(cpu)

def parse_mem_to_gb(mem_str: str) -> float:
    """Convert Kubernetes memory string to GB"""
    if mem_str is None:
        return 0.0
    if isinstance(mem_str, (int, float)):
        return float(mem_str) / (1024**3)
    s = str(mem_str).strip().upper()
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