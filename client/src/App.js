import React, { Component } from 'react';
import Game from './Game.js';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div className="App">
        <Game Socket={this.props.Socket} />
      </div>
    );
  }
}

export default App;
