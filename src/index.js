/* eslint-disable no-console */
import './styles/style.css';
import 'bootstrap/dist/css/bootstrap.css';
import * as yup from 'yup';
import watchedState from './handlers/watcher.js';

const validateLink = (link) => {
  const schema = yup.string().url();
  return schema.validate(link);
};

const form = document.querySelector('.rss-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const link = data.get('url');
  const validationResult = validateLink(link);
  validationResult
    .then(() => {
      watchedState.form.status = 'valid';
      watchedState.form.error = '';

      const isUniqueLink = !watchedState.data.sources.includes(link);

      if (watchedState.form.status === 'valid' && isUniqueLink) {
        watchedState.form.status = 'updated';
        watchedState.data.sources.push(link);
      } else if (watchedState.form.status === 'valid') {
        watchedState.form.status = 'invalid';
        watchedState.form.error = 'not unique link';
      }
    })
    .catch((err) => {
      if (err.name === 'ValidationError') {
        watchedState.form.status = 'invalid';
        watchedState.form.error = err.message;
      } else {
        throw err;
      }
    });
});
