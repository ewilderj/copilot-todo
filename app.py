from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
import os

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
            # Add position if missing
            for i, todo in enumerate(todos):
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
    todo = request.form.get('todo')
    if todo:
        todos.append({
            'text': todo, 
            'completed': False, 
            'notes': '',
            'position': get_next_position()
        })
        save_todos(todos)
    return redirect(url_for('index'))

@app.route('/delete/<int:todo_id>')
def delete_todo(todo_id):
    global todos
    if 0 <= todo_id < len(todos):
        deleted_pos = todos[todo_id]['position']
        todos.pop(todo_id)
        # Update positions for remaining items
        for todo in todos:
            if todo['position'] > deleted_pos:
                todo['position'] -= 1
        save_todos(todos)
    return redirect(url_for('index'))

@app.route('/complete/<int:todo_id>', methods=['POST'])
def complete_todo(todo_id):
    if 0 <= todo_id < len(todos):
        todos[todo_id]['completed'] = not todos[todo_id]['completed']
        save_todos(todos)
    return jsonify(success=True)

@app.route('/update_note/<int:todo_id>', methods=['POST'])
def update_note(todo_id):
    if 0 <= todo_id < len(todos):
        note = request.json.get('note', '')
        todos[todo_id]['notes'] = note
        save_todos(todos)
        return jsonify(success=True)
    return jsonify(success=False), 404

@app.route('/reorder', methods=['POST'])
def reorder_todos():
    global todos
    order = request.json.get('order')
    if not order:
        return jsonify(success=False), 400
    
    reordered = []
    for idx, pos in enumerate(order):
        todo = todos[int(pos)]
        todo['position'] = idx
        reordered.append(todo)
    
    todos = reordered
    save_todos(todos)
    return jsonify(success=True)

@app.route('/update_text/<int:todo_id>', methods=['POST'])
def update_text(todo_id):
    if 0 <= todo_id < len(todos):
        text = request.json.get('text', '').strip()
        if not text:
            return jsonify(success=False, error="Todo text cannot be empty"), 400
        todos[todo_id]['text'] = text
        save_todos(todos)
        return jsonify(success=True)
    return jsonify(success=False), 404

@app.route('/todos.json')
def get_todos_json():
    return jsonify(todos)

if __name__ == '__main__':
    app.run(debug=True)