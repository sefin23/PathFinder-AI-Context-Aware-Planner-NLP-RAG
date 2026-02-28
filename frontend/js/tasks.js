// =====================================================
// tasks.js — Page 2: Task Dashboard for a Life Event
// Pathfinder AI · Layer 1.4
// =====================================================

const API = "http://127.0.0.1:8000";

// Read event ID from URL: tasks.html?id=3
const params  = new URLSearchParams(window.location.search);
const EVENT_ID = parseInt(params.get("id"), 10);

// Cache of all tasks (needed to populate subtask dropdown)
let allTasks = [];

// ── Utilities ─────────────────────────────────────

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast toast--${type} show`;
    setTimeout(() => { toast.className = "toast"; }, 3000);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function priorityDot(priority) {
    return `<span class="priority-dot priority-dot--${priority}"></span>${priority}`;
}

function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
    });
}

function isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr + "T00:00:00") < new Date(new Date().toDateString());
}

// ── Load Life Event Details ────────────────────────

async function loadEventDetails() {
    if (!EVENT_ID || isNaN(EVENT_ID)) {
        document.getElementById("event-title-heading").textContent = "Invalid event.";
        return;
    }

    try {
        const res = await fetch(`${API}/life-events/${EVENT_ID}`);
        if (!res.ok) throw new Error("Event not found");
        const ev = await res.json();

        document.title = `Pathfinder AI — ${ev.title}`;
        document.getElementById("nav-event-title").textContent       = ev.title;
        document.getElementById("event-title-heading").textContent   = ev.title;
        document.getElementById("event-desc-text").textContent       = ev.description || "";
    } catch (err) {
        document.getElementById("event-title-heading").textContent = "Event not found.";
        showToast("Could not load event details.", "error");
    }
}

// ── Load & Render Tasks ────────────────────────────

async function loadTasks() {
    try {
        const sortVal = document.getElementById("task-sort").value;
        const res = await fetch(`${API}/tasks/grouped?life_event_id=${EVENT_ID}&sort_by=${sortVal}`);
        if (!res.ok) throw new Error("Failed to load tasks");
        const data = await res.json();
        
        // Flatten tasks for the subtask dropdown
        allTasks = data.groups.flatMap(g => g.tasks);
        
        renderTasks(data);
        populateParentDropdown(allTasks);
    } catch (err) {
        showToast("Could not load tasks.", "error");
    }
}

function renderTasks(data) {
    const container = document.getElementById("tasks-container");
    const empty     = document.getElementById("tasks-empty");
    const counter   = document.getElementById("task-count");

    container.innerHTML = "";

    const total = data.total;
    counter.textContent = total ? `${total} active task${total > 1 ? 's' : ''}` : "";

    if (total === 0) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    // We build a subtask map to find children for any parent that appears in the same group or another group.
    // However, to keep grouping true to the API, we can render tasks exactly as they appear in their buckets.
    // We will still pass 'isSubtask=true' if parent_id is set.
    
    data.groups.forEach(group => {
        if (!group.tasks || group.tasks.length === 0) return;

        // Create Section Header
        const header = document.createElement("div");
        header.className = "group-header";
        header.textContent = group.category;
        container.appendChild(header);

        // Create List
        const list = document.createElement("ul");
        list.className = "task-list";
        
        group.tasks.forEach(task => {
            const isSubtask = task.parent_id != null;
            list.appendChild(buildTaskItem(task, isSubtask));
        });

        container.appendChild(list);
    });
}

function buildTaskItem(task, isSubtask) {
    const isDone    = task.status === "completed";
    const overdue   = !isDone && isOverdue(task.due_date);

    const li = document.createElement("li");
    let classes = ["task-item"];
    if (isSubtask) classes.push("task-item--subtask");
    if (overdue) classes.push("task-item--overdue");
    li.className = classes.join(" ");
    li.id = `task-${task.id}`;
    
    const dueToday  = !isDone && !overdue && task.due_date && (new Date(task.due_date+"T00:00:00").toDateString() === new Date().toDateString());
    
    let badges = "";
    if (overdue) badges += `<span class="badge badge--overdue">OVERDUE</span> `;
    if (dueToday) badges += `<span class="badge badge--today">DUE TODAY</span> `;

    // Priority Dropdown (Layer 2)
    const prioritySelect = `
        <select class="inline-select" onchange="updateTaskField(${task.id}, 'priority', this.value)">
            <option value="1" ${task.priority===1 ? "selected":""}>1 - Lowest</option>
            <option value="2" ${task.priority===2 ? "selected":""}>2 - Low</option>
            <option value="3" ${task.priority===3 ? "selected":""}>3 - Medium</option>
            <option value="4" ${task.priority===4 ? "selected":""}>4 - High</option>
            <option value="5" ${task.priority===5 ? "selected":""}>5 - Critical</option>
        </select>
    `;

    // Due Date Input (Layer 2)
    const dueInput = `
        <input type="date" class="inline-input" value="${task.due_date ? task.due_date.substring(0, 10) : ''}" 
               onchange="updateTaskField(${task.id}, 'due_date', this.value)" title="Due Date">
    `;

    // Reminder toggle (Layer 2)
    const reminderToggle = `
        <label style="cursor:pointer; display:flex; align-items:center;" title="Opt out of daily email reminders">
            <input type="checkbox" class="inline-checkbox" 
                   ${task.reminder_opt_out ? "checked" : ""} 
                   onchange="updateTaskField(${task.id}, 'reminder_opt_out', this.checked)">
            Mute Reminders
        </label>
    `;

    li.innerHTML = `
        <input
            type="checkbox"
            class="task-check"
            id="check-${task.id}"
            title="Mark as complete"
            ${isDone ? "checked" : ""}
            onchange="toggleTaskStatus(${task.id}, this.checked)"
        />
        <div class="task-body">
            <div class="task-title ${isDone ? "done" : ""}" id="task-title-${task.id}">
                ${isSubtask ? "↳ " : ""}${escapeHtml(task.title)}
            </div>
            <div class="task-meta">
                ${badges}
                ${prioritySelect}
                ${dueInput}
                ${reminderToggle}
            </div>
        </div>
        <div class="task-actions">
            <button class="btn btn--ghost btn--sm" onclick="deleteTask(${task.id})" title="Delete task">
                🗑
            </button>
        </div>
    `;

    return li;
}

// ── Populate Parent Dropdown ───────────────────────

function populateParentDropdown(tasks) {
    const select = document.getElementById("task-parent");
    // Reset to just the default option
    select.innerHTML = `<option value="">— Top-level task —</option>`;

    // Only top-level tasks can be parents (no infinite nesting in the UI for now)
    tasks
        .filter(t => t.parent_id === null || t.parent_id === undefined)
        .forEach(t => {
            const opt = document.createElement("option");
            opt.value       = t.id;
            opt.textContent = t.title.length > 50
                ? t.title.slice(0, 50) + "…"
                : t.title;
            select.appendChild(opt);
        });
}

// ── Create Task ────────────────────────────────────

async function createTask() {
    const title    = document.getElementById("task-title").value.trim();
    const desc     = document.getElementById("task-desc").value.trim();
    const priority = document.getElementById("task-priority").value;
    const due      = document.getElementById("task-due").value || null;
    const parentId = document.getElementById("task-parent").value
        ? parseInt(document.getElementById("task-parent").value, 10)
        : null;

    if (!title) {
        showToast("Please enter a task title.", "error");
        document.getElementById("task-title").focus();
        return;
    }

    const btn = document.getElementById("btn-add-task");
    btn.disabled = true;
    btn.textContent = "Adding…";

    try {
        const res = await fetch(`${API}/tasks/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title:         title,
                description:   desc || null,
                priority:      parseInt(priority, 10),
                due_date:      due,
                life_event_id: EVENT_ID,
                parent_id:     parentId
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Failed to create task");
        }

        // Clear form fields
        document.getElementById("task-title").value    = "";
        document.getElementById("task-desc").value     = "";
        document.getElementById("task-due").value      = "";
        document.getElementById("task-priority").value = "3";
        document.getElementById("task-parent").value   = "";

        showToast(`Task added!`, "success");
        await loadTasks();

    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Add Task";
    }
}

// ── Update Task Field (Layer 2) ────────────────────

async function updateTaskField(taskId, fieldName, value) {
    const payload = {};
    if (fieldName === 'priority') {
        payload.priority = parseInt(value, 10);
    } else if (fieldName === 'due_date') {
        payload.due_date = value || null; // null to clear
    } else if (fieldName === 'reminder_opt_out') {
        payload.reminder_opt_out = value;
    }

    try {
        const res = await fetch(`${API}/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Update failed");
        
        // Quietly reload to see sorted changes if urgency changed
        await loadTasks();
    } catch (err) {
        showToast(`Could not update ${fieldName}.`, "error");
    }
}

// ── Toggle Task Status ─────────────────────────────

async function toggleTaskStatus(taskId, isChecked) {
    const newStatus = isChecked ? "completed" : "pending";

    try {
        const res = await fetch(`${API}/tasks/${taskId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error("Status update failed");

        // Update the title style immediately without a full reload
        const titleEl = document.getElementById(`task-title-${taskId}`);
        if (titleEl) {
            isChecked
                ? titleEl.classList.add("done")
                : titleEl.classList.remove("done");
        }

        // Refresh counter
        await loadTasks();

    } catch (err) {
        showToast("Could not update task status.", "error");
        // Revert checkbox
        const checkbox = document.getElementById(`check-${taskId}`);
        if (checkbox) checkbox.checked = !isChecked;
    }
}

// ── Delete Task ────────────────────────────────────

async function deleteTask(taskId) {
    if (!confirm("Delete this task? This will also remove any subtasks.")) return;

    try {
        const res = await fetch(`${API}/tasks/${taskId}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) throw new Error("Delete failed");

        showToast("Task deleted.", "success");
        await loadTasks();
    } catch (err) {
        showToast("Could not delete task.", "error");
    }
}

// ── Bootstrap ─────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    if (!EVENT_ID || isNaN(EVENT_ID)) {
        showToast("No life event selected. Redirecting…", "error");
        setTimeout(() => { window.location.href = "index.html"; }, 2000);
        return;
    }
    await loadEventDetails();
    await loadTasks();
});
