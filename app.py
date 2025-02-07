from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
import os
import uuid

app = Flask(__name__)

# Path to the JSON file
TODO_FILE = 'todos.json'

# In-memory storage for todo items
todos = []

def load_todos():
    global todos
    if os.path.exists(TODO_FILE):
        with open(TODO_FILE, 'r') as file:
            todos = json.load(file)
            # Add UUID and position if missing
            for i, todo in enumerate(todos):
                if 'id' not in todo:
                    todo['id'] = str(uuid.uuid4())
                if 'position' not in todo:
                    todo['position'] = i
    return sorted(todos, key=lambda x: x['position'])

# Initialize todos at startup
todos = load_todos()

# Save todos to the JSON file
def save_todos(todos):
    with open(TODO_FILE, 'w') as file:
        json.dump(todos, file)

# Get next available position
def get_next_position():
    return len(todos)

@app.route('/')
def index():
    return render_template('index.html', todos=todos)

@app.route('/add', methods=['POST'])
def add_todo():
    global todos
    if request.is_json:
        data = request.get_json()
        text = data.get('text', '').strip()
        notes = data.get('notes', '').strip()
    else:
        text = request.form.get('todo', '').strip()
        notes = ''
    
    if text:
        new_todo = {
            'id': str(uuid.uuid4()),
            'text': text,
            'notes': notes,
            'completed': False,
            'position': get_next_position()
        }
        todos.append(new_todo)
        save_todos(todos)
        return jsonify(success=True, todo=new_todo)
    return jsonify(success=False, error="Todo text cannot be empty"), 400

@app.route('/delete/<todo_id>')
def delete_todo(todo_id):
    global todos
    deleted_pos = None
    for i, todo in enumerate(todos):
        if todo['id'] == todo_id:
            deleted_pos = todo['position']
            todos.pop(i)
            break
    
    if deleted_pos is not None:
        # Update positions for remaining items
        for todo in todos:
            if todo['position'] > deleted_pos:
                todo['position'] -= 1
        save_todos(todos)
    return redirect(url_for('index'))

@app.route('/complete/<todo_id>', methods=['POST'])
def complete_todo(todo_id):
    for todo in todos:
        if todo['id'] == todo_id:
            todo['completed'] = not todo['completed']
            save_todos(todos)
            return jsonify(success=True)
    return jsonify(success=False), 404

@app.route('/update_note/<todo_id>', methods=['POST'])
def update_note(todo_id):
    for todo in todos:
        if todo['id'] == todo_id:
            note = request.json.get('note', '')
            todo['notes'] = note
            save_todos(todos)
            return jsonify(success=True)
    return jsonify(success=False), 404

@app.route('/reorder', methods=['POST'])
def reorder_todos():
    global todos
    order = request.json.get('order')
    if not order:
        return jsonify(success=False), 400
    
    # Create a mapping of id to todo item
    todo_map = {todo['id']: todo for todo in todos}
    
    reordered = []
    for idx, todo_id in enumerate(order):
        if todo_id in todo_map:
            todo = todo_map[todo_id]
            todo['position'] = idx
            reordered.append(todo)
    
    todos = reordered
    save_todos(todos)
    return jsonify(success=True)

@app.route('/update_text/<todo_id>', methods=['POST'])
def update_text(todo_id):
    for todo in todos:
        if todo['id'] == todo_id:
            text = request.json.get('text', '').strip()
            if not text:
                return jsonify(success=False, error="Todo text cannot be empty"), 400
            todo['text'] = text
            save_todos(todos)
            return jsonify(success=True)
    return jsonify(success=False), 404

@app.route('/todos.json')
def get_todos_json():
    return jsonify(todos)

if __name__ == '__main__':
    app.run(debug=True)