import React, { Component } from 'react';
import './App.css';

import Game from './Game.js';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {msgs: []};
  }

  joinClicked() {
    const code = document.getElementById("txtCode").value;
    if (code !== '') {
      this.props.Socket.emit('joinRoom', code);
      this.setState({ room: code });
    } 
  }

  render() {
    return (
        this.state.room ? <Game Socket={this.props.Socket} /> :
        <div className="App">
          <div id="divEnterName">
            <span>Enter Name:</span>
            <input type="text" placeholder="Name"></input>
          </div>
          <div id="divEnterCode">
            <span>Enter Code:</span>
            <input id="txtCode" type="password" placeholder="Code"></input>
          </div>
          <div id="divJoin">
            <input type="button" onClick={() => this.joinClicked()} value="Join"></input>
          </div>
        </div>
    );
  }
}

export default App;
