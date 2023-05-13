import onChange from 'on-change';

const renderFormMessage = (container, messageInfo, i18n) => {
  const { key: messageKey, type: messageType = 'danger' } = messageInfo;
  container.innerHTML = '';
  container.classList.remove('text-success');
  container.classList.remove('text-danger');
  container.classList.add(`text-${messageType}`);

  container.textContent = i18n.t(messageKey);
};

const generateContentWrapper = (title) => {
  const wrapper = document.createElement('DIV');
  wrapper.classList.add('card', 'border-0');
  wrapper.innerHTML = `<div class="card-body"><h2 class="card-title h4">${title}</h2></div>`;

  const ul = document.createElement('UL');
  ul.classList.add('list-group', 'border-0', 'rounded-0');

  return { wrapper, ul };
};

const renderFeeds = (container, feeds, i18n) => {
  container.innerHTML = '';

  const { wrapper, ul } = generateContentWrapper(i18n.t('content.feeds.title'));
  feeds.forEach(({ title, description }) => {
    const li = document.createElement('LI');
    li.classList.add('list-group-item', 'border-0', 'border-end-0');

    li.innerHTML = `<h3 class="h6 m-0">${title}</h3> <p class="m-0 small text-black-50">${description}</p>`;
    ul.appendChild(li);
  });

  container.appendChild(wrapper);
  container.appendChild(ul);
};

const renderPosts = (container, posts, i18n) => {
  container.innerHTML = '';
  const sortedPosts = posts.sort((a, b) => b.feedId - a.feedId);

  const { wrapper, ul } = generateContentWrapper(i18n.t('content.posts.title'));

  sortedPosts.forEach(({
    title,
    link,
    id,
  }) => {
    const li = document.createElement('LI');
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    const a = document.createElement('A');
    a.classList.add('fw-bold');
    a.dataset.id = id;
    a.setAttribute('href', link);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreffer');
    a.textContent = title;

    const button = document.createElement('BUTTON');
    button.setAttribute('type', 'button');
    button.dataset.id = id;
    button.dataset.bsToggle = 'modal';
    button.dataset.bsTarget = '#modal';
    button.classList.add('btn', 'btn-outline-primary', 'btn-sm');
    button.textContent = i18n.t('content.posts.button');

    li.appendChild(a);
    li.appendChild(button);
    ul.appendChild(li);
  });

  container.appendChild(wrapper);
  container.appendChild(ul);
};

export default (state, i18nInstance) => onChange(state, (path, value) => {
  const form = document.querySelector('.rss-form');
  const input = form.querySelector('#url-input');
  const messageElement = document.querySelector('.feedback');
  const button = form.querySelector('[type=submit]');
  const feeds = document.querySelector('.feeds');
  const posts = document.querySelector('.posts');

  if (path.startsWith('form.message')) {
    renderFormMessage(messageElement, value, i18nInstance);
  }

  if (path.startsWith('data')) {
    input.classList.remove('is-invalid');
    form.reset();
    input.focus();
  }

  if (path === 'form.status') {
    switch (value) {
      case 'invalid':
        input.classList.add('is-invalid');
        break;
      case 'updated':
        button.classList.remove('disabled');
        break;
      default:
        throw new Error(`Unexpected form status: ${value}`);
    }
  }
  if (path === 'fetch') {
    switch (value) {
      case 'filling':
        button.classList.add('disabled');
        break;
      case 'filled':
        button.classList.remove('disabled');
        break;
      case 'failed':
        button.classList.remove('disabled');
        break;
      default:
        throw new Error(`Unexpected fetch status: ${value}`);
    }
  }

  if (path.startsWith('data.feeds')) {
    renderFeeds(feeds, state.data.feeds, i18nInstance);
  }

  if (path.startsWith('data.posts')) {
    renderPosts(posts, state.data.posts, i18nInstance);
  }
});
