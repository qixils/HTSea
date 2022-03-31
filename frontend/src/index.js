import './colors.module.scss';
import style from './index.module.css';

import React from 'react';
import ReactDOM from 'react-dom';
import reportWebVitals from './reportWebVitals';
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {createStore, applyMiddleware} from 'redux';
import thunkMiddleware from 'redux-thunk';
import {Provider} from 'react-redux';

import App from './App';
import Navbar from './components/Navbar/Navbar';
import Wordle from './components/Wordle/Wordle';
import Message from './components/Message/Message';

import rootReducer from './redux/reducer';
const store = createStore(rootReducer(), applyMiddleware(thunkMiddleware));

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Navbar />
        <div className={style.main}>
          <Routes>
            <Route path="/" element={<App />} /> 
            <Route path="wordle" element={<Wordle />} /> 
            <Route path="message/:id" element={<Message />} /> 
            {/* <Route path="user/:id" element={<Message />} />  */}
          </Routes>
        </div>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

reportWebVitals();
