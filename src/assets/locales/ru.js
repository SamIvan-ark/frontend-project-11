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
          empty: 'Не должно быть пустым',
          network: 'Ошибка сети',
        },
        success: 'RSS успешно загружен',
      },
    },
    example: 'Пример: https://ru.hexlet.io/lessons.rss',
    content: {
      posts: {
        title: 'Посты',
        button: 'Просмотр',
      },
      feeds: {
        title: 'Фиды',
      },
      popup: {
        expand: 'Читать полностью',
        close: 'Закрыть',
      },
    },
  },
};
