(function () {
  'use strict'

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('sw.js')
  }

  let ENTER_KEY = 13
  let newTodoDom = document.getElementById('new-todo')
  let syncDom = document.getElementById('sync-wrapper')
  let todoCount = document.getElementById('todo-count')

  let db = new PouchDB('todos')
  let remoteCouch = false

  db.changes({
    since: 'now',
    live: true
  }).on('change', showTodos)

  function addTodo(text) {
    if (!text.trim().length) return

    let todo = {
      _id: new Date().toISOString(),
      title: text,
      completed: false
    }

    db.put(todo)
      .then(console.log('Successfully posted a todo!'))
      .catch(console.log)
  }

  async function showTodos() {
    const dbAllDock = await db.allDocs({ include_docs: true, descending: true })
    todoCount.innerHTML = dbAllDock.total_rows ||''
    redrawTodosUI(dbAllDock.rows)
  }

  function checkboxChanged(todo, event) {
    todo.completed = event.target.checked
    db.put(todo)
  }

  const deleteButtonPressed = todo => db.remove(todo)

  function todoBlurred(todo, event) {
    let trimmedText = event.target.value.trim()

    if (!trimmedText) return db.remove(todo)

    todo.title = trimmedText
    db.put(todo)
  }

  function sync() {
  }

  const syncError = () => syncDom.setAttribute('data-sync-state', 'error')

  function todoDblClicked(todo) {
    let div = document.getElementById('li_' + todo._id)
    let inputEditTodo = document.getElementById('input_' + todo._id)
    div.className = 'editing'
    inputEditTodo.focus()
  }

  function todoKeyPressed(todo, event) {
    if (event.keyCode === ENTER_KEY) {
      let inputEditTodo = document.getElementById('input_' + todo._id)
      inputEditTodo.blur()
    }
  }

  function createTodoListItem(todo) {
    let checkbox = document.createElement('input')
    checkbox.className = 'toggle'
    checkbox.type = 'checkbox'
    checkbox.addEventListener('change', checkboxChanged.bind(this, todo))

    let label = document.createElement('label')
    label.appendChild(document.createTextNode(todo.title))
    label.addEventListener('dblclick', todoDblClicked.bind(this, todo))

    let deleteLink = document.createElement('button')
    deleteLink.className = 'destroy'
    deleteLink.addEventListener('click', deleteButtonPressed.bind(this, todo))

    let divDisplay = document.createElement('div')
    divDisplay.className = 'view'
    divDisplay.appendChild(checkbox)
    divDisplay.appendChild(label)
    divDisplay.appendChild(deleteLink)

    let inputEditTodo = document.createElement('input')
    inputEditTodo.id = 'input_' + todo._id
    inputEditTodo.className = 'edit'
    inputEditTodo.value = todo.title
    inputEditTodo.addEventListener('keypress', todoKeyPressed.bind(this, todo))
    inputEditTodo.addEventListener('blur', todoBlurred.bind(this, todo))

    let li = document.createElement('li')
    li.id = 'li_' + todo._id
    li.appendChild(divDisplay)
    li.appendChild(inputEditTodo)

    if (todo.completed) {
      li.className += 'complete'
      checkbox.checked = true
    }

    return li
  }

  function redrawTodosUI(todos) {
    let ul = document.getElementById('todo-list')
    ul.innerHTML = ''
    todos.forEach(function (todo) {
      ul.appendChild(createTodoListItem(todo.doc))
    })
  }

  function newTodoKeyPressHandler(event) {
    if (event.keyCode === ENTER_KEY) {
      addTodo(newTodoDom.value)
      newTodoDom.value = ''
    }
  }

  function addEventListeners() {
    newTodoDom.addEventListener('keypress', newTodoKeyPressHandler, false)
  }

  addEventListeners()
  showTodos()

  if (remoteCouch) sync()
})()
