import React, { Component } from 'react';
import _ from 'lodash';
import './Game.css';
const FPS = 60;
const SCALE = 5;
const PLAYER_SPEED = 0.05;

class Game extends Component {
    constructor(props) {
        super(props);

        props.Socket.on('gameBoardUpdate', (delta) => {
            this.setState((lastState) => {
                let newBoard = _.cloneDeep(lastState.board);
                _.forEach(delta, (obj) => {
                    newBoard[obj.row][obj.col] = obj.tile;
                });
                return {board: newBoard};
            });
        });
        props.Socket.on('join', ({socketId, gameData}) => {
            this.setState({id: socketId, ...gameData});
            this.gameInterval = setInterval(() => { this.gameLoop() }, 1000 / FPS);
        })

        props.Socket.on('removeEntity', (searchTerm) => {
            if (typeof(searchTerm) === 'number') {
                this.setState((lastState) => {
                    let entities = lastState.entities.slice();
                    entities.splice(searchTerm, 1);
                    return { entities };
                })
            }
            const playerIndex = _.findIndex(this.state.entities, searchTerm);
            this.state.entities.splice(playerIndex, 1);
        });
        props.Socket.on('addEntity', (entity) => {
            this.setState((lastState) => {
                let entities = lastState.entities.slice();
                entities.push(entity);
                return { entities };
            })
        });
        props.Socket.on('entityChanged', (entity) => {
            this.setState((lastState) => {
                let entities = lastState.entities.slice();
                let entityIndex = _.findIndex(entities, {id: entity.id});
                entities[entityIndex] = entity;
                return {entities};
            })
        })
        this.state = {};
    }

    specialRenders = {
        wheatSeed: (iRow, iCol) => {
            const middle = this.state.board[iRow][iCol].middle;
            return (
                <div style={{backgroundColor: '#66ff00', width: middle.progress + '%', height: middle.progress + '%', margin: 'auto auto'}}></div>
            )
        }
    }

    keys = {
        justPressed: (code) => {
            return this.keys[code] && this.keys[code] === 0;
        },
        isHeld: (code) => {
            return this.keys[code] !== undefined && this.keys[code] > -1;
        }
    }

    keyDown = (e) => {
        e.preventDefault();
        this.keys[e.keyCode] = 0;
    }
    keyUp = (e) => {
        e.preventDefault();
        this.keys[e.keyCode] = -1;
    }

    componentDidMount() {
        window.addEventListener('keydown', this.keyDown);
        window.addEventListener('keyup', this.keyUp);
    }
    componentWillUnmount() {
        window.removeEventListener('keydown', this.keyDown);
        window.removeEventListener('keyup', this.keyUp);
        clearInterval(this.gameInterval);
    }

    moveEntity = (velocity, searchTerm) => {
        this.setState((lastState) => {
            let entities = lastState.entities.slice();
            let me = _.find(entities, searchTerm);
            if (me) {
                me.position.y += velocity.y;
                me.position.x += velocity.x;
                this.props.Socket.emit('entityChanged', me);
            }
            return { entities };
        });
    }

    gameLoop() {
        if (this.keys.isHeld(37)) {
            this.moveEntity({x: -PLAYER_SPEED, y: 0}, {type: 'player', playerId: this.state.id});
        }
        if (this.keys.isHeld(38)) {
            this.moveEntity({x: 0, y: -PLAYER_SPEED}, {type: 'player', playerId: this.state.id});
        }
        if (this.keys.isHeld(39)) {
            this.moveEntity({x: PLAYER_SPEED, y: 0}, {type: 'player', playerId: this.state.id});
        }
        if (this.keys.isHeld(40)) {
            this.moveEntity({x: 0, y: PLAYER_SPEED}, {type: 'player', playerId: this.state.id});
        }

        _.forEach(this.keys, (val) => {
            if (typeof(val) === 'number') {
                if (val !== -1) {
                    val++;
                }
            }
        });
    }

    render() {
        let gameBoard = null;
        if (this.state.board) {
            gameBoard = <div id="gameBoard">
                {this.state.board.map((tileRow, iRow) => {
                return tileRow.map((tile, iCol) => {
                    let layer = tile.top || tile.bottom;
                    if (!tile.top && tile.middle && tile.middle.solid) {
                        layer = tile.middle;
                    }
                    return <div style={{left: iCol * SCALE + 'vw', top: iRow * SCALE + 'vw'}} key={iCol} className={'tile ' + (layer.type || '')}>
                            {(!tile.top && tile.middle && !tile.middle.solid && this.specialRenders[tile.middle.type]) ? this.specialRenders[tile.middle.type](iRow, iCol) : null}
                        </div>
                });
            })}
            {this.state.entities.map((entity, i) => {
                return (<div style={{width: entity.size.x * SCALE + 'vw', height: entity.size.y * SCALE + 'vw', position: 'absolute', top: entity.position.y * SCALE + 'vw', left: entity.position.x * SCALE + 'vw', backgroundColor: '#000000', borderRadius: '30%'}}></div>);
            })}
            </div>
        }
        return (
            <div id="gameScreen">
                {gameBoard}
            </div>
        )
    }
}

export default Game;