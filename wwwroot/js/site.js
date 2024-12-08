﻿// wwwroot/js/site.js

let activeTimer = {
    ticketId: null,
    startTime: null,
    interval: null,
    totalSeconds: 0,
    isPaused: false,
    pausedTime: 0
};
// Sound elements
const sounds = {
    start: new Audio('/sounds/start.mp3'),
    stop: new Audio('/sounds/stop.mp3'),
    pause: new Audio('/sounds/pause.mp3')
};

function startTimer(ticketId) {
    if (activeTimer.interval) {
        stopTimer();
    }

    //sounds.start.play();

    const button = $(`.btn-timer[data-ticket-id="${ticketId}"]`);

    // Fetch checklist items and populate the modal
    $.get(`/Tickets/GetChecklistItems/${ticketId}`, function (items) {
        const select = $('#taskSelect');
        select.empty();
        select.append('<option value="">General Work</option>');

        items.forEach(item => {
            if (!item.isCompleted) {
                select.append(`<option value="${item.id}">${item.description}</option>`);
            }
        });

        // Show task selection modal
        const modal = new bootstrap.Modal(document.getElementById('taskSelectionModal'));
        modal.show();

        // Handle the start button in the modal
        $('#startTaskTimer').off('click').on('click', function () {
            const selectedTaskId = $('#taskSelect').val();
            const selectedTaskText = $('#taskSelect option:selected').text();
            const taskNotes = $('#taskNotes').val();

            const taskDescription = selectedTaskId
                ? `Task: ${selectedTaskText} - ${taskNotes}`
                : taskNotes || 'General work';

            activeTimer = {
                ticketId: ticketId,
                startTime: new Date(),
                totalSeconds: 0,
                interval: setInterval(updateTimerDisplay, 1000),
                isPaused: false,
                pausedTime: 0,
                description: taskDescription,
                taskId: selectedTaskId
            };

            // Update UI
            button.addClass('active')
                .find('i')
                .removeClass('fa-play')
                .addClass('fa-stop');

            updateTimerDisplay();
            updateRunningTotal(ticketId);
            saveTimerState();

            modal.hide();
        });
    });
}
//function confirmStopTimer() {
//    if (confirm('Are you sure you want to stop the timer? This will save the time entry.')) {
//        stopTimer();
//    }
//}
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
            'timeEntry.Duration': '00:00:00',
            'timeEntry.Description': `Timer tracked time: ${formatTime(duration)}`,
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
//function pauseTimer() {
//    if (!activeTimer.interval || activeTimer.isPaused) return;

//    sounds.pause.play();

//    clearInterval(activeTimer.interval);
//    activeTimer.isPaused = true;
//    activeTimer.pausedTime = calculateTotalDuration();

//    // Update UI - Show play icon when paused
//    const button = $(`.btn-timer[data-ticket-id="${activeTimer.ticketId}"]`);
//    button.addClass('active')
//        .find('i')
//        .removeClass('fa-stop')
//        .addClass('fa-play');

//    saveTimerState();
//}
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
    // Initialize timer buttons
    document.querySelectorAll('.btn-timer').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const ticketId = this.getAttribute('data-ticket-id');

            if (this.classList.contains('active')) {
                if (activeTimer.isPaused) {
                    resumeTimer();
                } else {
                    //confirmStopTimer();
                    stopTimer();
                }
            } else {
                startTimer(ticketId);
            }
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
