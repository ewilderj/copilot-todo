function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Sortable
    const el = document.getElementById('todo-list');
    const sortable = Sortable.create(el, {
        handle: '.handle',
        animation: 150,
        dataIdAttr: 'data-id',
        onEnd: function (evt) {
            const order = Array.from(el.children).map(item => item.getAttribute('data-id'));
            fetch('/reorder', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ order: order })
            }).then(response => {
                if (response.ok) updateJsonData();
            });
        }
    });

    // Initialize debug visibility
    const debugVisible = localStorage.getItem('debugVisible') === 'true';
    updateDebugVisibility(debugVisible);
    updateJsonData();

    // Add event listeners
    document.getElementById('show-add-todo').addEventListener('click', function() {
        this.style.display = 'none';
        const form = document.getElementById('add-todo-form');
        form.style.display = 'block';
        document.getElementById('new-todo-text').focus();
    });

    document.getElementById('new-todo-text').addEventListener('keydown', handleNewTodo);
    document.getElementById('new-todo-notes').addEventListener('keydown', handleNewTodo);
    document.getElementById('debug-toggle').addEventListener('click', toggleDebugView);
});

// Todo operations
window.toggleComplete = function(checkbox) {
    const todoId = checkbox.closest('.list-group-item').getAttribute('data-id');
    fetch(`/complete/${todoId}`, {
        method: 'POST'
    }).then(response => {
        if (response.ok) {
            const textSpan = checkbox.closest('.list-group-item').querySelector('.todo-text');
            textSpan.classList.toggle('todo-completed', checkbox.checked);
            updateJsonData();
        }
    });
}

window.editNote = function(button) {
    const listItem = button.closest('.list-group-item');
    const noteContainer = listItem.querySelector('.todo-notes');
    const notesText = noteContainer.querySelector('.notes-text');
    const currentNote = notesText.textContent;
    let isEscaping = false;
    
    // Show the notes container
    requestAnimationFrame(() => noteContainer.classList.add('has-note'));
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentNote;
    input.className = 'form-control form-control-sm notes-edit';
    input.placeholder = 'Add a note';
    
    notesText.style.display = 'none';
    noteContainer.querySelector('.d-flex').insertBefore(input, notesText);
    input.focus();
    
    function saveNote() {
        if (isEscaping) return;
        const todoId = button.getAttribute('data-id');
        fetch(`/update_note/${todoId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ note: input.value })
        }).then(response => {
            if (response.ok) {
                if (input.value) {
                    notesText.textContent = input.value;
                    noteContainer.classList.add('has-note');
                    notesText.style.display = 'block';
                    button.innerHTML = '<i class="fas fa-edit"></i>';
                    button.setAttribute('data-tooltip', 'Edit Note');
                } else {
                    notesText.textContent = '';
                    notesText.style.display = 'block';
                    noteContainer.classList.remove('has-note');
                    button.innerHTML = '<i class="fas fa-plus-circle"></i>';
                    button.setAttribute('data-tooltip', 'Add Note');
                }
                input.remove();
                updateJsonData();
            }
        });
    }
    
    input.addEventListener('keypress', e => e.key === 'Enter' && saveNote());
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            isEscaping = true;
            notesText.style.display = 'block';
            noteContainer.classList.toggle('has-note', currentNote);
            input.remove();
        }
    });
    input.addEventListener('blur', saveNote);
}

window.confirmDelete = function(button) {
    const todoId = button.getAttribute('data-id');
    const todoText = button.closest('.list-group-item').querySelector('.todo-text').textContent;
    if (confirm(`Are you sure you want to delete "${todoText}"?`)) {
        window.location.href = `/delete/${todoId}`;
    }
}

window.editText = function(textSpan) {
    const listItem = textSpan.closest('.list-group-item');
    const todoId = listItem.getAttribute('data-id');
    const currentText = textSpan.textContent;
    let isEscaping = false;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'form-control';
    
    textSpan.style.display = 'none';
    textSpan.parentNode.insertBefore(input, textSpan);
    input.focus();
    
    function saveText() {
        if (isEscaping) return;
        const newText = input.value.trim();
        if (!newText) {
            input.classList.add('is-invalid');
            return;
        }
        
        fetch(`/update_text/${todoId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: newText })
        }).then(response => {
            if (response.ok) {
                textSpan.textContent = newText;
                textSpan.style.display = '';
                input.remove();
                updateJsonData();
            } else {
                input.classList.add('is-invalid');
            }
        });
    }
    
    input.addEventListener('keypress', e => e.key === 'Enter' && saveText());
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            isEscaping = true;
            textSpan.style.display = '';
            input.remove();
        }
    });
    input.addEventListener('blur', saveText);
}

// Helper functions
function resetAddTodoForm() {
    const form = document.getElementById('add-todo-form');
    const button = document.getElementById('show-add-todo');
    form.style.display = 'none';
    button.style.display = 'block';
    document.getElementById('new-todo-text').value = '';
    document.getElementById('new-todo-notes').value = '';
}

function handleNewTodo(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const textInput = document.getElementById('new-todo-text');
        const notesInput = document.getElementById('new-todo-notes');
        const text = textInput.value.trim();
        const notes = notesInput.value.trim();

        if (text) {
            fetch('/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text, notes })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resetAddTodoForm();
                    window.location.reload();
                } else {
                    alert(data.error || 'Failed to add todo');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to add todo');
            });
        }
    } else if (event.key === 'Escape') {
        resetAddTodoForm();
    }
}

const updateJsonData = debounce(() => {
    fetch('/todos.json')
        .then(response => response.json())
        .then(data => {
            document.getElementById('json-data').textContent = JSON.stringify(data, null, 2);
        });
}, 250);

function updateDebugVisibility(show) {
    const debugSection = document.getElementById('debug-section');
    debugSection.style.display = show ? 'block' : 'none';
    localStorage.setItem('debugVisible', show);
    if (show) updateJsonData();
}

function toggleDebugView() {
    const debugSection = document.getElementById('debug-section');
    const isCurrentlyShown = debugSection.style.display === 'block';
    updateDebugVisibility(!isCurrentlyShown);
}
