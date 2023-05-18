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

const renderModal = (container, id, state) => {
  const { title, description, link } = state
    .data
    .posts
    .filter((post) => Number(post.id) === Number(id))[0];
  const header = container.querySelector('.modal-title');
  header.textContent = title;

  const modalBody = container.querySelector('.modal-body');
  modalBody.innerHTML = `<p>${description}</p>`;

  const readMoreButton = container.querySelector('.modal-footer > a');
  readMoreButton.setAttribute('href', link);
};

const renderViewedPosts = (container, list) => {
  const renderedPosts = container.getElementsByTagName('LI');
  const viewedPosts = Array.from(renderedPosts).filter((post) => {
    const currentId = Number(post.querySelector('A').dataset.id);
    return list.includes(currentId);
  });

  viewedPosts.forEach((post) => {
    const titleElement = post.querySelector('A');
    titleElement.classList.remove('fw-bold');
    titleElement.classList.add('fw-normal', 'link-secondary');
  });
};

const renderPosts = (container, state, i18n) => {
  container.innerHTML = '';
  const sortedPosts = state
    .data
    .posts
    .sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

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
    a.addEventListener('click', () => {
      state.ui.viewedPosts.push(Number(id));
    });

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

  renderViewedPosts(container, state.ui.viewedPosts);
};

export default {
  formMessage: renderFormMessage,
  feeds: renderFeeds,
  posts: renderPosts,
  modal: renderModal,
  viewedPosts: renderViewedPosts,
};
