import onChange from 'on-change';

const state = {
  form: {
    status: 'idle',
    error: '',
  },
  data: {
    sources: [],
  },
};

const form = document.querySelector('.rss-form');
const button = form.querySelector('[type=submit]');
const input = form.querySelector('#url-input');

export default onChange(state, (path, value) => {
  if (path === 'form.status') {
    switch (value) {
      case 'invalid':
        input.classList.add('is-invalid');
        break;
      case 'valid':
        input.classList.remove('is-invalid');
        break;
      case 'updated':
        form.reset();
        form.focus();
        break;
      case 'sending':
        button.classList.add('disabled');
        break;
      default:
        throw new Error(`Unexpected form status: ${form.status}`);
    }
  }
});