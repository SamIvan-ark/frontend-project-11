import './styles/style.css';
import 'bootstrap/dist/css/bootstrap.css';
import i18next from 'i18next';
import * as yup from 'yup';
import makeWatchedState from './view.js';
import ru from './assets/locales/index.js';

const i18nInstance = i18next.createInstance();
i18nInstance.init({
  fallbackLng: 'ru',
  resources: {
    ru,
  },
});

yup.setLocale({
  string: {
    url: 'form.messages.errors.invalid',
  },
  mixed: {
    notOneOf: 'form.messages.errors.nonUnique',
  },
});

const state = {
  form: {
    status: 'idle',
    message: {
      key: '',
      type: '',
    },
  },
  data: {
    sources: [],
  },
};

const watchedState = makeWatchedState(state, i18nInstance);

const buildSchema = (sources) => yup.string().url().notOneOf(sources);
const validateLink = (link, schema) => schema.validate(link);

export default () => {
  const form = document.querySelector('.rss-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const link = data.get('url');
    const validationResult = validateLink(link, buildSchema(watchedState.data.sources));
    validationResult
      .then(() => {
        watchedState.form.status = 'updated';
        watchedState.form.message = { key: 'form.messages.success', type: 'success' };
        watchedState.data.sources.push(link);
      })
      .catch((err) => {
        if (err.name === 'ValidationError') {
          watchedState.form.status = 'invalid';
          watchedState.form.message = { key: err.message, type: 'danger' };
        } else {
          throw err;
        }
      });
  });
};
