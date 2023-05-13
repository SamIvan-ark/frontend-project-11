const parser = new DOMParser();
const getterFromDocByTag = (dom) => (tag) => dom.querySelector(tag).textContent;

const getPostsData = (nodeList, targetId, createNextPostId) => {
  const arr = Array.from(nodeList);
  const data = arr.map((node) => {
    const getterOfDataFromNode = getterFromDocByTag(node);
    const title = getterOfDataFromNode('title');
    const description = getterOfDataFromNode('description');
    const link = getterOfDataFromNode('link');
    const pubDate = getterOfDataFromNode('pubDate');
    return {
      id: createNextPostId(),
      feedId: targetId,
      title,
      description,
      link,
      pubDate,
    };
  });
  return data;
};

export default (string, feedId, createNextPostId) => {
  const documentFromData = parser.parseFromString(string, 'application/xml');
  const parserErrorElement = documentFromData.querySelector('parsererror');
  if (parserErrorElement) {
    throw new SyntaxError('form.messages.errors.noRss');
  }
  const get = getterFromDocByTag(documentFromData);
  const title = get('title');
  const description = get('description');
  const posts = documentFromData.querySelectorAll('item');
  const postsData = getPostsData(posts, feedId, createNextPostId);
  return {
    feed: {
      title,
      description,
    },
    posts: postsData,
  };
};
