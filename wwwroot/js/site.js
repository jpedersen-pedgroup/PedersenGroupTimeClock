// wwwroot/js/site.js

let activeTimer = {
    ticketId: null,
    startTime: null,
    interval: null,
    totalSeconds: 0,
    isPaused: false,
    pausedTime: 0
};
function startTimer(ticketId, taskInfo = null) {
    if (activeTimer.interval) {
        stopTimer();
    }

    // If no task info, show the modal to get it
    if (taskInfo === null) {
        showTaskSelectionModal(ticketId);
        return;
    }

    // Actually start the timer with the task info
    //sounds.start.play();

    activeTimer = {
        ticketId: ticketId,
        startTime: new Date(),
        totalSeconds: 0,
        interval: setInterval(updateTimerDisplay, 1000),
        isPaused: false,
        pausedTime: 0,
        description: taskInfo.taskId ?
            `Task: ${$('#taskSelect option:selected').text()} - ${taskInfo.notes}` :
            taskInfo.notes || 'General work'
    };

    // Update UI
    const button = $(`.btn-timer[data-ticket-id="${ticketId}"]`);
    button.addClass('active')
        .find('i')
        .removeClass('fa-play')
        .addClass('fa-stop');

    updateTimerDisplay();
    updateRunningTotal(ticketId);
    saveTimerState();
}

//function startTimer(ticketId) {
//    if (activeTimer.interval) {
//        stopTimer();
//    }

//    // Show task selection modal
//    const taskModal = document.getElementById('taskSelectionModal');
//    const startTaskButton = document.getElementById('startTaskTimer');

//    if (taskModal && startTaskButton) {
//        const modal = new bootstrap.Modal(taskModal, {
//            keyboard: true,
//            focus: true,
//            backdrop: true
//        });

//        // Get checklist items for the ticket
//        fetch(`/Tickets/GetChecklistItems/${ticketId}`)
//            .then(response => response.json())
//            .then(items => {
//                const select = document.getElementById('taskSelect');
//                select.innerHTML = '<option value="">General Work</option>';

//                items.forEach(item => {
//                    if (!item.isCompleted) {
//                        const option = document.createElement('option');
//                        option.value = item.id;
//                        option.textContent = item.description;
//                        select.appendChild(option);
//                    }
//                });

//                // Remove any existing click handlers
//                startTaskButton.replaceWith(startTaskButton.cloneNode(true));

//                // Get the fresh reference after replacing
//                const newStartTaskButton = document.getElementById('startTaskTimer');

//                // Add click handler
//                newStartTaskButton.addEventListener('click', function () {
//                    const selectedTask = document.getElementById('taskSelect').value;
//                    const taskDescription = document.getElementById('taskNotes').value || 'General work';

//                    activeTimer = {
//                        ticketId: ticketId,
//                        startTime: new Date(),
//                        totalSeconds: 0,
//                        interval: setInterval(updateTimerDisplay, 1000),
//                        isPaused: false,
//                        pausedTime: 0,
//                        description: selectedTask ?
//                            `Task: ${document.getElementById('taskSelect').options[document.getElementById('taskSelect').selectedIndex].text} - ${taskDescription}` :
//                            taskDescription
//                    };

//                    // Update UI
//                    const button = document.querySelector(`.btn-timer[data-ticket-id="${ticketId}"]`);
//                    button.classList.add('active');
//                    button.querySelector('i').classList.replace('fa-play', 'fa-stop');

//                    updateTimerDisplay();
//                    updateRunningTotal(ticketId);
//                    saveTimerState();

//                    // Hide the modal
//                    modal.hide();
//                });

//                modal.show();
//            })
//            .catch(error => console.error('Error loading checklist items:', error));
//    }
//}
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Loaded');
    console.log('Start Task Button:', document.getElementById('startTaskTimer')); // Debug

    // Add click handler to all timer buttons
    document.querySelectorAll('.btn-timer').forEach(button => {
        button.addEventListener('click', function (e) {
            console.log('Timer button clicked:', this.dataset.ticketId); // Debug
            const ticketId = this.dataset.ticketId;
            if (this.classList.contains('active')) {
                stopTimer();
            } else {
                startTimer(ticketId);
            }
        });
    });
});
function stopTimer() {
    if (!activeTimer.interval) return;

    //sounds.stop.play();

    clearInterval(activeTimer.interval);
    const duration = calculateTotalDuration();
    const ticketId = activeTimer.ticketId;

    // Save time entry
    $.ajax({
        url: '/Tickets/AddTimeEntry',
        type: 'POST',
        data: {
            'timeEntry.Ticket': activeTimer.title,
            'timeEntry.ticketId': activeTimer.ticketId,
            'timeEntry.Duration': `${formatTime(duration)}`,
            'timeEntry.Description': activeTimer.description,
            duration: duration,
            ticketId: ticketId
        },
        headers: {
            'RequestVerificationToken': $('input[name="__RequestVerificationToken"]').val()
        },
        success: function (response) {
            if (response.success) {
                updateTotalTime(activeTimer.ticketId, response.totalTime);
                showNotification('Time entry saved successfully', 'success');
            }
        }
    });

    resetTimerUI();
    localStorage.removeItem('activeTimer');
}
function resumeTimer() {
    if (!activeTimer.isPaused) return;

    sounds.start.play();

    activeTimer.startTime = new Date();
    activeTimer.isPaused = false;
    activeTimer.interval = setInterval(updateTimerDisplay, 1000);

    // Update UI - Show stop icon when resumed
    const button = $(`.btn-timer[data-ticket-id="${activeTimer.ticketId}"]`);
    button.addClass('active')
        .find('i')
        .removeClass('fa-play')
        .addClass('fa-stop');

    saveTimerState();
}
function resetTimerUI() {
    if (!activeTimer.ticketId) return;

    // Reset button to initial state
    const button = $(`.btn-timer[data-ticket-id="${activeTimer.ticketId}"]`);
    button.removeClass('active')
        .find('i')
        .removeClass('fa-stop fa-play')
        .addClass('fa-play');

    $(`#timer-${activeTimer.ticketId}`).text('');

    activeTimer = {
        ticketId: null,
        startTime: null,
        interval: null,
        totalSeconds: 0,
        isPaused: false,
        pausedTime: 0
    };
}
function calculateTotalDuration() {
    if (!activeTimer.startTime) return 0;

    const baseSeconds = activeTimer.isPaused ?
        activeTimer.pausedTime :
        Math.floor((new Date() - activeTimer.startTime) / 1000);

    return baseSeconds;
}
function updateRunningTotal(ticketId) {
    const totalElement = $(`#total-time-${ticketId}`);
    if (!totalElement.length) return;

    const currentTotal = parseFloat(totalElement.data('total') || 0);
    const runningSeconds = calculateTotalDuration();
    const runningHours = runningSeconds / 3600;
    const newTotal = (currentTotal + runningHours).toFixed(1);

    totalElement.text(`${newTotal}h`);
    totalElement.data('running-total', newTotal);
}

// Update the view to include these new elements
function updateTimerDisplay() {
    if (!activeTimer.startTime) return;

    const elapsedSeconds = calculateTotalDuration();
    activeTimer.totalSeconds = elapsedSeconds;

    const display = formatTime(elapsedSeconds);
    $(`#timer-${activeTimer.ticketId}`).text(display);
    updateRunningTotal(activeTimer.ticketId);
}

// Add to your saveTimerState function
function saveTimerState() {
    if (activeTimer.ticketId) {
        localStorage.setItem('activeTimer', JSON.stringify({
            ticketId: activeTimer.ticketId,
            startTime: activeTimer.startTime.toISOString(),
            isPaused: activeTimer.isPaused,
            pausedTime: activeTimer.pausedTime
        }));
    }
}
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
}

function padNumber(number) {
    return number.toString().padStart(2, '0');
}

// Event handlers
document.addEventListener('DOMContentLoaded', function () {
    // Handle timer button clicks
    document.querySelectorAll('.btn-timer').forEach(button => {
        button.addEventListener('click', function (e) {
            console.log('Timer button clicked:', this.dataset.ticketId);
            const ticketId = this.dataset.ticketId;
            if (this.classList.contains('active')) {
                stopTimer();
            } else {
                startTimer(ticketId);
            }
        });
    });

    // Handle modal start timer button
    document.getElementById('confirmStartTimer').addEventListener('click', function () {
        console.log('Confirm start timer clicked');
        const taskId = document.getElementById('taskSelect').value;
        const notes = document.getElementById('taskNotes').value;

        const modal = bootstrap.Modal.getInstance(document.getElementById('taskSelectionModal'));
        if (modal) {
            modal.hide();
        }

        startTimer(activeTimer.ticketId, {
            taskId: taskId,
            notes: notes
        });
    });

    // Add pause button functionality
    document.querySelectorAll('.btn-pause').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            if (activeTimer.interval && !activeTimer.isPaused) {
                pauseTimer();
            } else {
                resumeTimer();
            }
        });
    });

    // Handle page unload
    window.addEventListener('beforeunload', function () {
        if (activeTimer.interval) {
            stopTimer();
        }
    });

    $('#startTaskTimer').click(function () {
        selectedTask = $('#taskSelect').val();
        selectedTaskNotes = $('#taskNotes').val();
        $('#taskSelectionModal').modal('hide');

        // Start the timer with the selected task
        startTimer(activeTimer.ticketId, {
            taskId: selectedTask,
            notes: selectedTaskNotes
        });
    });
});

// Save timer state when changed
function saveTimerState() {
    if (activeTimer.ticketId) {
        localStorage.setItem('activeTimer', JSON.stringify({
            ticketId: activeTimer.ticketId,
            startTime: activeTimer.startTime
        }));
    } else {
        localStorage.removeItem('activeTimer');
    }
}


// Time Entry Edit/Delete functionality
document.addEventListener('DOMContentLoaded', function () {
    // Edit Time Entry
    $(document).on('click', '.edit-entry', function () {
        const entryId = $(this).data('entry-id');
        $.get(`/Tickets/GetTimeEntry/${entryId}`, function (data) {
            $('#timeEntryId').val(data.id);
            $('#timeEntryDescription').val(data.description);
            $('#timeEntryDuration').val(data.duration);
        });
    });

    // Save Time Entry Changes
    $('#saveTimeEntry').click(function () {
        const id = $('#timeEntryId').val();
        const description = $('#timeEntryDescription').val();
        const hours = $('#timeEntryDuration').val();

        $.post('/Tickets/EditTimeEntry', {
            id: id,
            description: description,
            hours: hours,
            __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
        }, function (response) {
            if (response.success) {
                location.reload(); // or update the UI without reloading
            }
        });
    });

    // Delete Time Entry
    $(document).on('click', '.delete-entry', function () {
        if (confirm('Are you sure you want to delete this time entry?')) {
            const entryId = $(this).data('entry-id');

            $.post('/Tickets/DeleteTimeEntry', {
                id: entryId,
                __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
            }, function (response) {
                if (response.success) {
                    $(`#entry-${entryId}`).remove();
                    // Update totals without reloading
                    updateTotals(response.totalTime, response.budgetRemaining);
                }
            });
        }
    });

    const taskModal = document.getElementById('taskSelectionModal');
    const startTaskButton = document.getElementById('startTaskTimer');

    if (taskModal && startTaskButton) {
        startTaskButton.addEventListener('click', function () {
            const taskId = document.getElementById('taskSelect').value;
            const notes = document.getElementById('taskNotes').value;

            const bsModal = bootstrap.Modal.getInstance(taskModal);
            if (bsModal) {
                bsModal.hide();
            }

            // Start the timer with the task info
            if (activeTimer.ticketId) {
                startTimer(activeTimer.ticketId, {
                    taskId: taskId,
                    notes: notes
                });
            }
        });
    }
});

function updateTotals(totalTime, budgetRemaining) {
    // Update the displayed totals
    $('.total-time').text(totalTime + 'h');
    $('.budget-remaining').text(budgetRemaining + 'h');
}

document.addEventListener('DOMContentLoaded', function () {
    // Check if charts exist before initializing
    const timeDistributionChart = document.getElementById('timeDistributionChart');
    const dailyTimeChart = document.getElementById('dailyTimeChart');

    if (timeDistributionChart) {
        const timeDistributionCtx = timeDistributionChart.getContext('2d');
        new Chart(timeDistributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Hours Used', 'Hours Remaining'],
                datasets: [{
                    data: [
                        parseFloat(document.getElementById('hoursUsed').value),
                        parseFloat(document.getElementById('hoursRemaining').value)
                    ],
                    backgroundColor: ['#36a2eb', '#ff6384']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    if (dailyTimeChart) {
        const dailyTimeCtx = dailyTimeChart.getContext('2d');
        const dailyTimeData = JSON.parse(document.getElementById('dailyTimeData').value);

        new Chart(dailyTimeCtx, {
            type: 'line',
            data: {
                labels: dailyTimeData.map(d => d.date),
                datasets: [{
                    label: 'Hours per Day',
                    data: dailyTimeData.map(d => d.hours),
                    borderColor: '#36a2eb',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        });
    }

    //Rate JS
    const rateSelect = document.getElementById('RateId');
    const selectedRateDiv = document.getElementById('selectedRate');

    if (rateSelect && selectedRateDiv) {
        rateSelect.addEventListener('change', function () {
            if (this.value) {  // Only fetch if a value is selected
                fetch(`/Rates/GetRateDetails/${this.value}`)
                    .then(response => response.json())
                    .then(data => {
                        selectedRateDiv.textContent = `${data.hourlyRate}/hour - ${data.description}`;
                    })
                    .catch(error => console.error('Error fetching rate details:', error));
            } else {
                selectedRateDiv.textContent = '';  // Clear the div if no rate is selected
            }
        });
    }

// Timer and task selection
let selectedTask = null;
let selectedTaskNotes = '';

function showTaskSelectionModal(ticketId) {
    // Fetch checklist items for the ticket
    $.get(`/Tickets/GetChecklistItems/${ticketId}`, function (items) {
        const select = $('#taskSelect');
        select.empty();
        select.append('<option value="">General Work</option>');

        items.forEach(item => {
            if (!item.isCompleted) {
                select.append(`<option value="${item.id}">${item.description}</option>`);
            }
        });

        $('#taskSelectionModal').modal('show');
    });
}

$('#startTaskTimer').click(function () {
    selectedTask = $('#taskSelect').val();
    selectedTaskNotes = $('#taskNotes').val();
    $('#taskSelectionModal').modal('hide');

    // Start the timer with the selected task
    startTimer(activeTimer.ticketId, {
        taskId: selectedTask,
        notes: selectedTaskNotes
    });
});

    // Checklist handling
    let checklistCounter = $('.checklist-items .input-group').length;
$('#addChecklistItem').click(function () {
    const newItem = `
        <div class="input-group mb-2">
            <input type="text" class="form-control" 
                   name="ChecklistItems[${checklistCounter}]" 
                   placeholder="Enter checklist item" />
            <button type="button" class="btn btn-outline-danger remove-checklist-item">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    $('.checklist-items').append(newItem);
    checklistCounter++;
});

$(document).on('click', '.remove-checklist-item', function () {
    $(this).closest('.input-group').remove();
    // Reindex remaining items
    $('.checklist-items .input-group').each(function (index) {
        $(this).find('input[type="text"]').attr('name', `ChecklistItems[${index}]`);
    });
    checklistCounter = $('.checklist-items .input-group').length;
});
});

// Timer and task selection
let selectedTask = null;
let selectedTaskNotes = '';

function showTaskSelectionModal(ticketId) {
    // Get checklist items for the ticket
    $.get(`/Tickets/GetChecklistItems/${ticketId}`, function (items) {
        const select = $('#taskSelect');
        select.empty().append('<option value="">General Work</option>');

        items.forEach(item => {
            if (!item.isCompleted) {
                select.append(`<option value="${item.id}">${item.description}</option>`);
            }
        });

        // Reset notes field
        $('#taskNotes').val('');

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('taskSelectionModal'));
        modal.show();

        // Set up the start button handler
        $('#startTaskTimer').off('click').on('click', function () {
            const taskId = $('#taskSelect').val();
            const notes = $('#taskNotes').val();
            modal.hide();

            startTimer(ticketId, {
                taskId: taskId,
                notes: notes
            });
        });
    });
}

