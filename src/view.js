import onChange from 'on-change';

const renderFormMessage = (container, messageInfo, i18n) => {
  const { key: messageKey, type: messageType } = messageInfo;
  container.innerHTML = '';
  container.classList.remove('text-success');
  container.classList.remove('text-danger');
  container.classList.add(`text-${messageType}`);

  container.textContent = i18n.t(messageKey);
};

export default (state, i18nInstance) => onChange(state, (path, value) => {
  const form = document.querySelector('.rss-form');
  const input = form.querySelector('#url-input');
  const messageElement = document.querySelector('.feedback');
  const button = form.querySelector('[type=submit]');

  if (path.startsWith('form.message')) {
    renderFormMessage(messageElement, value, i18nInstance);
  }

  if (path.startsWith('data')) {
    input.classList.remove('is-invalid');
    form.reset();
    form.focus();
  }

  if (path === 'form.status') {
    switch (value) {
      case 'invalid':
        input.classList.add('is-invalid');
        break;
      case 'updated':
        break;
      case 'sending':
        button.classList.add('disabled');
        break;
      default:
        throw new Error(`Unexpected form status: ${value}`);
    }
  }
});
