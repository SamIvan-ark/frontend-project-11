export default {
  translation: {
    header: 'RSS агрегатор',
    description: 'Начните читать RSS сегодня! Это легко, это красиво',
    form: {
      inputPlaceholder: 'Ссылка RSS',
      button: 'Добавить',
      messages: {
        errors: {
          invalid: 'Ссылка должна быть валидным URL',
          nonUnique: 'RSS уже существует',
          noRss: 'Ресурс не содержит валидный RSS',
        },
        success: 'RSS успешно загружен',
      },
    },
    example: 'Пример: https://ru.hexlet.io/lessons.rss',
    content: {
      posts: 'Посты',
      feeds: 'Фиды',
      popup: {
        expand: 'Читать полностью',
        close: 'Закрыть',
      },
    },
  },
};
