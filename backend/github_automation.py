import os
from typing import Dict, Any, List, Optional
from github import Github
import logging

logger = logging.getLogger(__name__)

class GitHubAutomation:
    """GitHub automation for creating PRs with optimization suggestions"""
    
    def __init__(self, github_token: str):
        """
        Initialize GitHub automation
        
        Args:
            github_token (str): GitHub personal access token
        """
        self.github = Github(github_token)
        
    def create_optimization_pr(self, repo_name: str, base_branch: str, 
                             changes: List[Dict[str, Any]], pr_title: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a PR with optimization suggestions
        
        Args:
            repo_name (str): Repository name (e.g., 'owner/repo')
            base_branch (str): Base branch to create PR against
            changes (List[Dict[str, Any]]): List of changes to apply
            pr_title (Optional[str]): PR title (optional)
            
        Returns:
            Dict[str, Any]: PR information
        """
        try:
            # Get repository
            repo = self.github.get_repo(repo_name)
            
            # Create a new branch for the changes
            base_ref = repo.get_git_ref(f"heads/{base_branch}")
            base_sha = base_ref.object.sha
            
            # Create new branch name
            import time
            branch_name = f"greenops-optimization-{int(time.time())}"
            
            # Create new branch
            repo.create_git_ref(f"refs/heads/{branch_name}", base_sha)
            
            # Apply changes to the new branch
            for change in changes:
                file_path = change.get("file_path")
                new_content = change.get("content")
                commit_message = change.get("commit_message", "Apply GreenOps optimization")
                
                if file_path and new_content:
                    # Get current file to preserve SHA for update
                    try:
                        contents = repo.get_contents(file_path, ref=branch_name)
                        # Handle the case where get_contents returns a list
                        if isinstance(contents, list):
                            content_obj = contents[0] if contents else None
                        else:
                            content_obj = contents
                            
                        if content_obj:
                            repo.update_file(
                                path=file_path,
                                message=commit_message,
                                content=new_content,
                                sha=content_obj.sha,
                                branch=branch_name
                            )
                        else:
                            # File doesn't exist, create it
                            repo.create_file(
                                path=file_path,
                                message=commit_message,
                                content=new_content,
                                branch=branch_name
                            )
                    except:
                        # File doesn't exist, create it
                        repo.create_file(
                            path=file_path,
                            message=commit_message,
                            content=new_content,
                            branch=branch_name
                        )
            
            # Create PR title if not provided
            if not pr_title:
                pr_title = f"[Auto] GreenOps Optimization Recommendations"
            
            # Create PR body
            pr_body = self._build_pr_body(changes)
            
            # Create PR
            pr = repo.create_pull(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=base_branch
            )
            
            # Add comment with summary
            summary_comment = self._build_summary_comment(changes)
            pr.create_issue_comment(summary_comment)
            
            return {
                "success": True,
                "pr_number": pr.number,
                "pr_url": pr.html_url,
                "branch_name": branch_name
            }
            
        except Exception as e:
            logger.error(f"Error creating optimization PR: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _build_pr_body(self, changes: List[Dict[str, Any]]) -> str:
        """
        Build PR body with changes description
        
        Args:
            changes (List[Dict[str, Any]]): List of changes
            
        Returns:
            str: PR body
        """
        body = "## 🌿 GreenOps Optimization Recommendations\n\n"
        body += "This PR contains automated optimization suggestions from GreenOps Advisor.\n\n"
        
        body += "### Changes\n"
        for change in changes:
            file_path = change.get("file_path", "Unknown")
            description = change.get("description", "Optimization")
            savings = change.get("estimated_savings", 0)
            carbon_reduction = change.get("carbon_reduction", 0)
            
            body += f"- **{file_path}**: {description}\n"
            if savings > 0:
                body += f"  - Estimated savings: ${savings:.2f}/month\n"
            if carbon_reduction > 0:
                body += f"  - Carbon reduction: {carbon_reduction:.2f} gCO2e/month\n"
        
        body += "\n### Review Instructions\n"
        body += "1. Review the suggested changes\n"
        body += "2. Test the changes in your environment\n"
        body += "3. Merge if approved\n\n"
        
        body += "---\n"
        body += "*Generated by GreenOps Advisor*"
        
        return body
    
    def _build_summary_comment(self, changes: List[Dict[str, Any]]) -> str:
        """
        Build summary comment for PR
        
        Args:
            changes (List[Dict[str, Any]]): List of changes
            
        Returns:
            str: Summary comment
        """
        total_savings = sum(change.get("estimated_savings", 0) for change in changes)
        total_carbon_reduction = sum(change.get("carbon_reduction", 0) for change in changes)
        
        comment = "## 📊 GreenOps Optimization Summary\n\n"
        comment += f"**Total Estimated Savings**: ${total_savings:.2f}/month\n"
        comment += f"**Total Carbon Reduction**: {total_carbon_reduction:.2f} gCO2e/month\n\n"
        
        comment += "### Next Steps\n"
        comment += "1. Review the changes in this PR\n"
        comment += "2. Test in your staging environment\n"
        comment += "3. Approve and merge if satisfied\n\n"
        
        comment += "*This is an automated suggestion. Please review carefully before merging.*"
        
        return comment

def get_github_automation() -> Optional[GitHubAutomation]:
    """
    Get GitHub automation instance if configured
    
    Returns:
        Optional[GitHubAutomation]: GitHub automation instance or None if not configured
    """
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token:
        return None
    
    return GitHubAutomation(github_token)