import React, { Component } from 'react';
import _ from 'lodash';
import './Game.css';
const FPS = 60;
const SCALE = 100;
const PLAYER_SPEED = 0.05;
const RENDER_DISTANCE = {x: 3, y: 3};

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
        props.Socket.on('join', ({socketId}) => {
            this.setState({id: socketId});
        });
        props.Socket.on('boardGenerationDone', () => {
            props.Socket.emit('getPlayerGameData');
        })
        props.Socket.on('playerGameData', (gameData) => {
            this.setState(gameData);
            this.gameInterval = setInterval(() => { this.gameLoop() }, 1000 / FPS);
        })

        props.Socket.on('removeEntity', (searchTerm) => {
            this.setState((lastState) => {
                if (searchTerm.type === 'player') {
                    let players = lastState.players.slice();
                    let playerIndex = _.findIndex(players, searchTerm);
                    players.splice(playerIndex, 1);
                    return { players };
                }else {
                    let entities = lastState.entities.slice();
                    let entityIndex = _.findIndex(entities, searchTerm);
                    entities.splice(entityIndex, 1);
                    return { entities };
                }
            });
        });
        props.Socket.on('addEntity', (entity) => {
            this.setState((lastState) => {
                if (entity.type === 'player') {
                    let players = lastState.players.slice();
                    players.push(entity);
                    return { players };
                } else {
                    let entities = lastState.entities.slice();
                    entities.push(entity);
                    return { entities };
                }
            })
        });
        props.Socket.on('entityChanged', (entity) => {
            this.setState((lastState) => {
                if (entity.type === 'player') {
                    let players = lastState.players.slice();
                    let playerIndex = _.findIndex(players, {id: entity.id});
                    players[playerIndex] = entity;
                    return { players };
                } else {
                    let entities = lastState.entities.slice();
                    let entityIndex = _.findIndex(entities, {id: entity.id});
                    entities[entityIndex] = entity;
                    return { entities };
                }
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

    mouse = {
        leftClick: -1,
        rightClick: -1,
        x: 0,
        y: 0
    }

    keyDown = (e) => {
        e.preventDefault();
        this.keys[e.keyCode] = 0;
    }
    keyUp = (e) => {
        e.preventDefault();
        this.keys[e.keyCode] = -1;
    }

    mouseMove = (e) => {
        this.mouse.x = e.x;
        this.mouse.y = e.y;
    }
    mouseUp = (e) => {
        if (e.which === 1) {
            this.mouse.leftClick = -1;
        } else if (e.which === 3) {
            this.mouse.rightClick = -1;
        }
        this.mouseMove(e);
    }
    mouseDown = (e) => {
        if (e.which === 1) {
            this.mouse.leftClick = 0;
        } else if (e.which === 3) {
            this.mouse.rightClick = 0;
        }
        this.mouseMove(e);
    }

    componentDidMount() {
        window.addEventListener('keydown', this.keyDown);
        window.addEventListener('keyup', this.keyUp);
        window.addEventListener('mousemove', this.mouseMove);
        window.addEventListener('mousedown', this.mouseDown);
        window.addEventListener('mouseup', this.mouseUp);
    }
    componentWillUnmount() {
        window.removeEventListener('keydown', this.keyDown);
        window.removeEventListener('keyup', this.keyUp);
        window.removeEventListener('mousemove', this.mouseMove);
        window.removeEventListener('mousedown', this.mouseDown);
        window.removeEventListener('mouseup', this.mouseUp);
        clearInterval(this.gameInterval);
    }

    moveEntity = (velocity, searchTerm) => {
        this.setState((lastState) => {
            let isPlayer = searchTerm.type === 'player';
            let players;
            let entities;
            let me;
            if (isPlayer) {
                players = lastState.players.slice();
                me = _.find(players, searchTerm);
            } else {
                entities = lastState.entities.slice();
                me = _.find(entities, searchTerm);
            }
            if (me) {
                me.position.y += velocity.y;
                me.position.x += velocity.x;
                this.props.Socket.emit('entityChanged', me);
            }
            if (isPlayer) {
                return { players };
            } else {
                return { entities };
            }
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
        if (this.mouse.leftClick !== -1) {
            this.mouse.leftClick++;
        }
        if (this.mouse.rightClick !== -1) {
            this.mouse.rightClick++;
        }
    }

    render() {
        let gameBoard = null;
        if (this.state.board) {
            const player = _.find(this.state.players, {type: 'player', playerId: this.state.id});
            let offset = {x: 0, y: 0};
            let gameBoardElement = document.getElementById('gameBoard');
            if (player && gameBoardElement) {
                offset = {x: (gameBoardElement.clientWidth / (2*SCALE)) - player.size.x / 2 - player.position.x, y: (gameBoardElement.clientHeight / (2*SCALE)) - player.size.y / 2 - player.position.y}
            }
            if (player) {
                gameBoard = <div id="gameBoard">
                    {this.state.board.map((tileRow, iRow) => {
                    if (Math.abs(iRow - player.position.y + this.state.offset.y) > RENDER_DISTANCE.y) {
                        return null;
                    }
                    return tileRow.map((tile, iCol) => {
                        if (Math.abs(iCol - player.position.x + this.state.offset.x) > RENDER_DISTANCE.x) {
                            return null;
                        }
                        let layer = tile.top || tile.bottom;
                        if (!tile.top && tile.middle && tile.middle.solid) {
                            layer = tile.middle;
                        }
                        return <div style={{height: SCALE + 'px', width: SCALE + 'px', left: (offset.x + iCol) * SCALE + 'px', top: (offset.y + iRow) * SCALE + 'px'}} key={iCol} className={'tile ' + (layer.type || '')}>
                                {(!tile.top && tile.middle && !tile.middle.solid && this.specialRenders[tile.middle.type]) ? this.specialRenders[tile.middle.type](iRow, iCol) : null}
                            </div>
                    });
                })}
                {_.concat(this.state.entities, this.state.players).map((entity, i) => {
                    return (<div key={i} style={{width: entity.size.x * SCALE + 'px', height: entity.size.y * SCALE + 'px', position: 'absolute', top: (offset.y + entity.position.y) * SCALE + 'px', left: (offset.x + entity.position.x) * SCALE + 'px', backgroundColor: '#000000', borderRadius: '30%'}}></div>);
                })}
                </div>
            }
        }
        return (
            <div id="gameScreen">
                {gameBoard}
            </div>
        )
    }
}

export default Game;