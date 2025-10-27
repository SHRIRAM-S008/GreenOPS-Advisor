# User Guide

## Overview

This guide provides instructions for using the GreenOps Advisor application to optimize Kubernetes workloads for cost and carbon efficiency.

## Getting Started

### Accessing the Application

1. Open your web browser and navigate to the GreenOps Advisor URL
2. If authentication is enabled, log in with your credentials
3. You will be directed to the main dashboard

### Dashboard Overview

The main dashboard provides an overview of:
- Current cost and carbon metrics
- Identified optimization opportunities
- Recent recommendations
- Cluster health status

## Metrics Dashboard

### Real-time Metrics

The metrics dashboard displays real-time data about your Kubernetes clusters:
- CPU and memory utilization
- Cost breakdown by workload
- Carbon footprint analysis
- Resource efficiency scores

### Filtering and Sorting

You can filter metrics by:
- Cluster
- Namespace
- Workload type
- Time range

Sort data by:
- Cost savings potential
- Carbon reduction potential
- Resource utilization
- Creation date

## Optimization Opportunities

### Viewing Opportunities

The Opportunities tab displays all identified optimization suggestions:
- Resource right-sizing recommendations
- Image optimization suggestions
- Scheduling improvements
- Security best practices

Each opportunity includes:
- Current configuration
- Recommended changes
- Estimated cost savings
- Projected carbon reduction
- Confidence score

### Applying Fixes

To apply a fix:

1. Navigate to the Opportunities tab
2. Select an opportunity to view details
3. Review the recommended changes
4. Click "Apply Fix" to implement the changes
5. Confirm the action in the dialog box

The application will:
- Generate the necessary YAML patch
- Apply the changes to your cluster
- Update the opportunity status
- Display the results

### Manual Implementation

For opportunities you prefer to implement manually:

1. Review the detailed recommendation
2. Download the YAML patch if provided
3. Apply the changes using kubectl or your preferred method
4. Mark the opportunity as resolved in the UI

## GitHub Integration

### PR Analysis

If GitHub integration is configured, the application will:
- Analyze pull requests for cost and carbon impact
- Comment on PRs with optimization suggestions
- Provide real-time feedback during code review

### Automated PRs

The application can create automated PRs with:
- Optimization recommendations
- Implementation details
- Cost and carbon impact analysis
- Links to relevant documentation

## Multi-Cluster Management

### Adding Clusters

To add a new cluster:

1. Navigate to the Clusters tab
2. Click "Add Cluster"
3. Provide cluster details:
   - Cluster name
   - Kubernetes API endpoint
   - Authentication credentials
4. Click "Save"

### Cluster Overview

Each cluster page provides:
- Resource utilization metrics
- Cost and carbon analysis
- Optimization opportunities
- Health status

## Settings

### Profile Management

Manage your user profile:
- Update contact information
- Change password
- Configure notification preferences

### Cluster Configuration

Configure cluster-specific settings:
- Cost calculation parameters
- Carbon intensity values
- Notification thresholds
- Integration credentials

### AI Provider Settings

Configure AI providers:
- Select primary and fallback providers
- Set API keys
- Configure model preferences
- Adjust timeout settings

## Reports and Analytics

### Cost Reports

Generate cost analysis reports:
- Time-based cost trends
- Workload cost breakdown
- Savings achieved
- Forecasting data

### Carbon Reports

Generate carbon footprint reports:
- Energy consumption analysis
- Carbon emission tracking
- Reduction progress
- Environmental impact

### Custom Reports

Create custom reports by:
- Selecting specific metrics
- Defining time ranges
- Applying filters
- Exporting data (CSV, PDF)

## Notifications

### Alert Configuration

Configure alerts for:
- Cost threshold breaches
- Carbon footprint increases
- New optimization opportunities
- System health issues

### Notification Channels

Set up notification channels:
- Email notifications
- Slack integration
- Webhook endpoints
- SMS alerts

## Advanced Features

### Predictive Analytics

The application provides predictive analytics for:
- Future resource needs
- Capacity planning
- Cost forecasting
- Carbon projection

### Custom Rules

Create custom optimization rules:
- Define specific criteria
- Set threshold values
- Configure actions
- Test rule effectiveness

### API Access

Access application data programmatically:
- REST API endpoints
- Authentication tokens
- Rate limiting
- Response formats

## Best Practices

### Regular Review

- Review opportunities weekly
- Implement high-impact suggestions first
- Monitor the results of applied fixes
- Adjust configurations as needed

### Cost Management

- Set budget alerts
- Monitor resource utilization
- Right-size workloads regularly
- Optimize container images

### Sustainability

- Track carbon footprint reduction
- Implement green computing practices
- Use efficient base images
- Schedule non-critical workloads

## Troubleshooting

### Common Issues

#### Issue: No metrics displayed
- Verify Prometheus integration
- Check network connectivity
- Review authentication credentials
- Confirm cluster access permissions

#### Issue: Fixes not applying
- Check Kubernetes permissions
- Verify cluster connectivity
- Review error messages
- Contact system administrator

#### Issue: GitHub integration not working
- Verify webhook configuration
- Check GitHub credentials
- Review repository permissions
- Confirm GitHub App settings

### Support

For assistance:
- Check the documentation
- Review system logs
- Contact your administrator
- Submit a support ticket

## Feedback and Suggestions

We welcome your feedback to improve GreenOps Advisor:
- Submit feature requests
- Report bugs or issues
- Suggest improvements
- Share success stories

Contact us at feedback@greenops-advisor.com

## Contact Information

For support and questions:
- Support: support@greenops-advisor.com
- Sales: sales@greenops-advisor.com
- General: info@greenops-advisor.com