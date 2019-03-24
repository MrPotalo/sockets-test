import React, { Component } from 'react';
import _ from 'lodash';
import './Game.css';

class Game extends Component {
    constructor(props) {
        super(props);


        props.Socket.on('join', ({socketId}) => {
            this.setState({id: socketId});
        });

        this.state = {};
    }

    render() {
        return (
            <div id="gameScreen">
            </div>
        )
    }
}

export default Game;