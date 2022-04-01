import {messageReducer, initialState as messageInitialState} from './message';
import {sessionReducer, initialState as sessionInitialState} from './session';
import {wordleReducer, initialState as wordleInitialState} from './wordle';
import {diamondsReducer} from './diamonds';
import {errorReducer} from './error';

const initialState = {
    message: messageInitialState,
    session: sessionInitialState,
    wordle: wordleInitialState,
    diamonds: null,
    error: null
};

const reduceReducers = (...reducers) => {
    return (prevState, value, ...args) => {
        return reducers.reduce((newState, reducer) => {
            return reducer(newState, value, ...args);
        }, prevState || initialState);
    }

}

const reducer = () => reduceReducers(messageReducer, sessionReducer, wordleReducer, diamondsReducer, errorReducer);

export default reducer;
