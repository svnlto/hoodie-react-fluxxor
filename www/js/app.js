var hoodie = new global.Hoodie();
var React = require('react');
var Fluxxor = require('fluxxor');

var constants = {
  LOAD: 'LOAD',
  LOAD_SUCCESS: 'LOAD_SUCCESS',
  LOAD_ERROR: 'LOAD_ERROR',
  ADD_TODO: 'ADD_TODO',
  TOGGLE_TODO: 'TOGGLE_TODO',
  CLEAR_TODOS: 'CLEAR_TODOS'
};

var TodoStore = Fluxxor.createStore({
  initialize: function () {
    this.loading = false;
    this.error = null;
    this.todos = [];

    this.bindActions(
      constants.LOAD, this.onLoad,
      constants.LOAD_SUCCESS, this.onLoadSuccess,
      constants.LOAD_ERROR, this.onLoadError,
      constants.ADD_TODO, this.onAddTodo,
      constants.TOGGLE_TODO, this.onToggleTodo,
      constants.CLEAR_TODOS, this.onClearTodos
    );
  },

  onLoad: function (payload) {
    this.loading = true;
    this.emit('change');
  },

  onLoadSuccess: function (payload) {
    this.loading = false;
    this.error = false;
    this.todos = payload.todos;
    this.emit('change');
  },

  onLoadError: function (payload) {
    this.loading = false;
    this.error = payload.err;
    this.emit('change');
  },

  onAddTodo: function (payload) {
    hoodie.store.add('todos', {
      text: payload.text,
      complete: false
    })
    .done(function (docs) {
      this.todos.push({
        text: payload.text,
        complete: false
      });
      this.emit('change');
    }.bind(this));
  },

  onToggleTodo: function (payload) {
    var todo = payload.todo;
    todo.complete = !todo.complete;

    hoodie.store.update('todos', todo.id, todo)
    .done(function (doc) {
      this.emit('change');
    }.bind(this));
  },

  onClearTodos: function () {
    this.todos.forEach(function (todo, index) {
      if (todo.complete && this.todos[index].id === todo.id) {
        delete this.todos[index];
        hoodie.store.remove('todos', todo.id)
        .done(function () {
           this.emit('change');
        }.bind(this));
      }
    }.bind(this));
  },

  getState: function () {
    return {
      todos: this.todos
    };
  }
});

var actions = {
  loadTodos: function () {
    this.dispatch(constants.LOAD, {
      todos: []
    });
    hoodie.store.findAll()
    .then(function (docs) {
      this.dispatch(constants.LOAD_SUCCESS, {
        todos: docs
      });
    }.bind(this))
    .fail(function (err) {
      this.dispatch(constants.LOAD_ERROR, {
        err: err
      });
    }.bind(this));
  },
  addTodo: function (text) {
    this.dispatch(constants.ADD_TODO, {text: text});
  },

  toggleTodo: function (todo) {
    this.dispatch(constants.TOGGLE_TODO, {todo: todo});
  },

  clearTodos: function () {
    this.dispatch(constants.CLEAR_TODOS);
  }
};

var stores = {
  TodoStore: new TodoStore()
};

var flux = new Fluxxor.Flux(stores, actions);

flux.on('dispatch', function (type, payload) {
  if (console && console.log) {
    console.log('[Dispatch]', type, payload);
  }
});

var FluxMixin = Fluxxor.FluxMixin(React),
    StoreWatchMixin = Fluxxor.StoreWatchMixin;

var Application = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin('TodoStore')],

  getInitialState: function () {
    return { newTodoText: '' };
  },

  getStateFromFlux: function () {
    var flux = this.getFlux();
    // Our entire state is made up of the TodoStore data. In a larger
    // application, you will likely return data from multiple stores, e.g.:
    //
    //   return {
    //     todoData: flux.store('TodoStore').getState(),
    //     userData: flux.store('UserStore').getData(),
    //     fooBarData: flux.store('FooBarStore').someMoreData()
    //   };
    return flux.store('TodoStore').getState();
  },

  componentDidMount: function () {
    flux.actions.loadTodos();
  },

  render: function () {
    return (
      <div>
        <ul>
          {this.state.todos.map(function (todo, i) {
            return <li key={i}><TodoItem todo={todo} /></li>;
          })}
        </ul>
        <form onSubmit={this.onSubmitForm}>
          <input type='text' size='30' placeholder='New Todo'
                 value={this.state.newTodoText}
                 onChange={this.handleTodoTextChange} />
          <input type='submit' value='Add Todo' />
        </form>
        <button onClick={this.clearCompletedTodos}>Clear Completed</button>
      </div>
    );
  },

  handleTodoTextChange: function (e) {
    this.setState({newTodoText: e.target.value});
  },

  onSubmitForm: function (e) {
    e.preventDefault();
    if (this.state.newTodoText.trim()) {
      this.getFlux().actions.addTodo(this.state.newTodoText);
      this.setState({newTodoText: ''});
    }
  },

  clearCompletedTodos: function (e) {
    this.getFlux().actions.clearTodos();
  }
});

var TodoItem = React.createClass({
  mixins: [FluxMixin],

  propTypes: {
    todo: React.PropTypes.object.isRequired
  },

  render: function () {
    var style = {
      textDecoration: this.props.todo.complete ? 'line-through' : ''
    };

    return <span style={style} onClick={this.onClick}>{this.props.todo.text}</span>;
  },

  onClick: function () {
    this.getFlux().actions.toggleTodo(this.props.todo);
  }
});

React.render(<Application flux={flux} />, document.getElementById('app'));
