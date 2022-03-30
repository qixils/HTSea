import {sessionReducer, initialState as sessionInitialState} from './session';
import {wordleReducer, initialState as wordleInitialState} from './wordle';

const initialState = {
    session: sessionInitialState,
    wordle: wordleInitialState,
    diamonds: null
};

const reduceReducers = (...reducers) => {
    return (prevState, value, ...args) => {
        return reducers.reduce((newState, reducer) => {
            return reducer(newState, value, ...args);
        }, prevState || initialState);
    }

}

const reducer = () => reduceReducers(sessionReducer, wordleReducer);

export default reducer;
