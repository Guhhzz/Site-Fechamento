window.MONTHLY_DASHBOARD_BUNDLES = window.MONTHLY_DASHBOARD_BUNDLES || [];

/*
  Registro de fechamentos mensais adicionais.

  Para publicar um novo mes no GitHub Pages, adicione aqui um objeto no formato:

  window.MONTHLY_DASHBOARD_BUNDLES.push({
    id: 'fechamento-julho-2026',
    fechamento: 'Julho 2026',
    nome: 'Fechamento Julho 2026.xlsx',
    data: '01/08/2026',
    size: 0,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: '',
    dashboard: {
      month: 'Julho 2026',
      department: 'Departamento Atendimento ao Cliente',
      general: {},
      sheets: []
    }
  });

  O campo "dashboard" deve conter a base ja processada no mesmo formato do DATA
  principal. Quando esse arquivo for publicado, todos os usuarios passam a ver o
  novo mes na area Bases de Fechamento e podem selecionar qual fechamento analisar.
*/
