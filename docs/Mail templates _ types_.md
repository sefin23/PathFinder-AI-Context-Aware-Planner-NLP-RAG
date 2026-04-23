# Pathfinder AI Notification & Communication System

This document outlines the strategy, timing, and logic for automated user communications within the Pathfinder ecosystem.

## 🌅 Morning Brief
**Schedule**: Sent once a day at 7:30 AM (local timezone).
**Condition**: Only triggered if the user has at least one **active plan**.
**Content**:
- **Focus of the Day**: The single most critical task currently due.
- **Weekly Outlook**: 2-3 upcoming tasks scheduled for the next 7 days.
- **Progress Snapshot**: Visual/textual summary of the current roadmap percentage.
- **Drift Detection**: Gentle mentions of tasks that have passed their deadline.
**Quiet Mode**: If all active plans are completed or none exist, the system remains silent (no email).

## 💡 Nudge (Smart Follow-up)
**Schedule**: Triggered for tasks untouched for 3+ days.
**Condition**: Task must be within its deadline week. Maximum 1 per day, 3 per week.
**Strategy**: Nudges are "Context-Aware" and emphasize **Downstream Impact**. They explain *why* the task matters rather than just reminding the user it exists.
- *Example*: "GST Registration has been waiting 3 days. Without it, you can't invoice your first client."

## 🏆 Milestone Celebration
**Schedule**: Instant delivery upon phase completion.
**Condition**: Triggered when all tasks in a roadmap 'Phase' transition to `completed`.
**Content**:
- **Post-Action Review**: Highlights what was accomplished and the time taken.
- **Next Steps**: Seamlessly pivots to the requirements of the next phase.
- **Journey Wrapped**: Upon total roadmap completion, this expands into a full statistical report card with shareable highlights.

## ⚠️ Conflict Alert (Urgent)
**Schedule**: Real-time detection.
**Condition**: Triggered when the AI detects a chronological contradiction (e.g., a prerequisite task scheduled after its dependant).
**Threshold**: Only for critical timing issues. Maximum one per day to avoid notification fatigue.
