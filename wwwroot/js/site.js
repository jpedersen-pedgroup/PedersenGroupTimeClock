// wwwroot/js/site.js

let activeTimer = {
    ticketId: null,
    startTime: null,
    interval: null,
    totalSeconds: 0,
    isPaused: false,
    pausedTime: 0,
    clientName: null
};

function startTimer(ticketId, taskInfo = null) {

    // Prevent starting a new timer for the same ticket
    if (activeTimer.interval && activeTimer.ticketId === ticketId) {
        console.warn('Timer already active for this ticket:', ticketId);
        showNotification('A timer is already running for this ticket.', 'warning');
        return; // Exit early
    }

    if (activeTimer.interval) {
        stopTimer();
    }

    // If no task info, show the modal to get it
    if (taskInfo === null) {
        activeTimer.ticketId = ticketId; // Retain the ticketId in activeTimer
        showTaskSelectionModal(ticketId);
        return;
    }

    console.log('ticketId used in fetch call:', ticketId);

    // Fetch client name from the backend (replace with your endpoint)
    fetch(`/Tickets/GetClientName/?ticketId=${ticketId}`)
        .then(response => response.json())
        .then(data => {
            const clientName = data.clientName;

            // Initialize the timer
            activeTimer = {
                ticketId: activeTimer.ticketId,
                startTime: new Date(),
                totalSeconds: 0,
                interval: setInterval(updateTimerDisplay, 1000),
                isPaused: false,
                pausedTime: 0,
                description: taskInfo.taskId
                    ? `Task: ${$('#taskSelect option:selected').text()} - ${taskInfo.notes}`
                    : taskInfo.notes || 'General work',
                clientName: clientName // Save client name
            };

            console.log('Timer started:', activeTimer);

            // Update UI
            const button = $(`.btn-timer[data-ticket-id="${ticketId}"]`);
            button.addClass('active')
                .find('i')
                .removeClass('fa-play')
                .addClass('fa-stop');

            saveTimerState();
            updateTimerDisplay();
            updateRunningTotal(ticketId);
            renderActiveTimerCard(); // Render updated card
        })
        .catch(error => {
            console.error('Error fetching client name:', error);
        });

}
function saveTimerState() {
    if (activeTimer.ticketId) {
        sessionStorage.setItem('activeTimer', JSON.stringify({
            ticketId: activeTimer.ticketId,
            startTime: activeTimer.startTime.toISOString(),
            isPaused: activeTimer.isPaused,
            pausedTime: activeTimer.pausedTime,
            description: activeTimer.description,
            clientName: activeTimer.clientName
        }));
    } else {
        sessionStorage.removeItem('activeTimer'); // Clear storage if no active timer
    }
}
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
        },
        error: function (response) {

            if (response) { }

        }
    });

    saveTimerState()
    resetTimerUI();
    localStorage.removeItem('activeTimer');
    sessionStorage.removeItem('activeTimer')
    renderActiveTimerCard(); // Remove the card
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

function calculateTotalDuration(timer = activeTimer) {
    if (!timer.startTime) return 0;

    const baseSeconds = timer.isPaused
        ? timer.pausedTime
        : Math.floor((new Date() - new Date(timer.startTime)) / 1000);

    return baseSeconds;
}
//function calculateTotalDuration() {
//    if (!activeTimer.startTime) return 0;

//    const baseSeconds = activeTimer.isPaused ?
//        activeTimer.pausedTime :
//        Math.floor((new Date() - activeTimer.startTime) / 1000);

//    return baseSeconds;
//}
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

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
}

function padNumber(number) {
    return number.toString().padStart(2, '0');
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

    const savedTimer = JSON.parse(sessionStorage.getItem('activeTimer'));
    if (savedTimer) {
        // Restore active timer
        activeTimer = {
            ticketId: savedTimer.ticketId,
            startTime: new Date(savedTimer.startTime),
            totalSeconds: 0,
            interval: setInterval(updateTimerDisplay, 1000),
            isPaused: savedTimer.isPaused,
            pausedTime: savedTimer.pausedTime,
            description: savedTimer.description
        };

        // Render the active timer card
        renderActiveTimerCard();
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

function renderActiveTimerCard() {
    const activeTimerData = JSON.parse(sessionStorage.getItem('activeTimer'));
    const container = document.getElementById('active-timer-card');

    // Clear the container content only once during initialization
    container.innerHTML = ''; 

    if (activeTimerData) {
        const elapsedSeconds = calculateTotalDuration(activeTimerData);
        const formattedTime = formatTime(elapsedSeconds);

        container.innerHTML = `
            <div class="card text-white bg-secondary mb-3" style="max-width:400px; max-height:150px">
                <div class="card-body p-0 ps-1">
                    <h5 class="card-title">${activeTimerData.clientName}</h5>
                    <div class="row">
                        <div class="col-9 pe-0">
                            <p class="card-text"><small>
                                ${activeTimerData.description} <br>
                                Time Elapsed: <span id="active-timer-elapsed">${formattedTime}</span>
                            </small></p>
                        </div>
                        <div class="col-3 ps-0">
                            <button id="stop-timer-btn" class="btn btn-danger">Stop</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Stop Timer Button
        document.getElementById('stop-timer-btn').addEventListener('click', () => {
            stopTimer();
            renderActiveTimerCard(); // Re-render the card
        });

        // Prevent reinitializing interval if already active
        if (!activeTimerInterval) {
            activeTimerInterval = setInterval(() => {
                if (!activeTimer || !activeTimer.startTime) {
                    clearInterval(activeTimerInterval);
                    activeTimerInterval = null; // Reset interval ID
                    return;
                }

                const updatedSeconds = calculateTotalDuration(activeTimer); // Use live activeTimer state
                const elapsedElement = document.getElementById('active-timer-elapsed');
                if (elapsedElement) {
                    elapsedElement.textContent = formatTime(updatedSeconds);
                }
            }, 1000);
        }
    }
}