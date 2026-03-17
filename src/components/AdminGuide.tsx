import { useState, useEffect } from 'react'
import {
  Building2, ArrowLeft, BookOpen, BarChart3, ClipboardList,
  Users, Columns3,
  CreditCard, Settings, Keyboard, Megaphone, Image,
  Layers, Search, ChevronDown, ChevronRight,
  CheckSquare, Square, Play, ImageIcon, MapPin, X as XIcon,
  ExternalLink, Rocket, Eye, Printer, Bookmark, BookmarkCheck,
  Sparkles, Star, Globe
} from 'lucide-react'

/* ── i18n ── */

type Lang = 'en' | 'pt'

const translations = {
  // Header
  adminGuide: { en: '/ Admin Guide', pt: '/ Guia Admin' },
  searchPlaceholder: { en: 'Search guide...', pt: 'Buscar no guia...' },
  expand: { en: 'Expand', pt: 'Expandir' },
  collapse: { en: 'Collapse', pt: 'Recolher' },
  printGuide: { en: 'Print guide', pt: 'Imprimir guia' },
  bookmarks: { en: 'Bookmarks', pt: 'Favoritos' },

  // Page title
  pageTitle: { en: 'Admin Guide', pt: 'Guia do Administrador' },
  pageSubtitle: {
    en: 'Internal operations manual — pipeline workflow, client management, landing pages, integrations, and everything you need to run StowStack day-to-day.',
    pt: 'Manual de operações interno — fluxo de pipeline, gestão de clientes, landing pages, integrações e tudo que você precisa para operar o StowStack no dia a dia.'
  },

  // TOC
  contents: { en: 'Contents', pt: 'Índice' },

  // Search
  sectionsMatching: { en: 'sections', pt: 'seções' },
  sectionMatching: { en: 'section', pt: 'seção' },
  matching: { en: 'matching', pt: 'correspondendo a' },
  clear: { en: 'Clear', pt: 'Limpar' },
  noResults: { en: 'No sections match', pt: 'Nenhuma seção corresponde a' },
  clearSearch: { en: 'Clear search', pt: 'Limpar busca' },

  // Quick Start
  quickStart: { en: 'Quick Start', pt: 'Início Rápido' },
  showChecklist: { en: 'Show quick-start checklist', pt: 'Mostrar checklist de início rápido' },
  done: { en: 'done', pt: 'concluído' },
  allDone: { en: "All done! You're ready to go.", pt: 'Tudo pronto! Você já pode começar.' },

  // Checklist items
  cl_login_title: { en: 'Log in to admin dashboard', pt: 'Fazer login no painel administrativo' },
  cl_login_desc: { en: 'Access the admin panel at /admin with your key', pt: 'Acesse o painel admin em /admin com sua chave' },
  cl_review_title: { en: 'Review your first lead', pt: 'Revisar seu primeiro lead' },
  cl_review_desc: { en: 'Open Pipeline and expand a lead card to see details', pt: 'Abra o Pipeline e expanda um card de lead para ver os detalhes' },
  cl_send_title: { en: 'Send onboarding form to a client', pt: 'Enviar formulário de onboarding para um cliente' },
  cl_send_desc: { en: 'Generate an access code and send the portal link', pt: 'Gere um código de acesso e envie o link do portal' },
  cl_facility_title: { en: 'Set up a facility', pt: 'Configurar uma unidade' },
  cl_facility_desc: { en: 'Create a facility record in the Facilities tab', pt: 'Crie um registro de unidade na aba Unidades' },
  cl_lp_title: { en: 'Create your first landing page', pt: 'Criar sua primeira landing page' },
  cl_lp_desc: { en: 'Build an ad-specific page with the section builder', pt: 'Monte uma página específica para anúncios com o construtor de seções' },
  cl_data_title: { en: 'Enter first month of campaign data', pt: 'Inserir os dados do primeiro mês de campanha' },
  cl_data_desc: { en: 'Add spend, leads, and move-in numbers for a facility', pt: 'Adicione gastos, leads e números de mudanças para uma unidade' },

  // Bookmarks panel
  myBookmarks: { en: 'My Bookmarks', pt: 'Meus Favoritos' },
  noBookmarks: {
    en: 'No bookmarks yet. Click the bookmark icon on any section to save it here for quick access.',
    pt: 'Nenhum favorito ainda. Clique no ícone de favorito em qualquer seção para salvar aqui e ter acesso rápido.'
  },
  removeBookmark: { en: 'Remove bookmark', pt: 'Remover favorito' },
  bookmarkThis: { en: 'Bookmark this section', pt: 'Salvar esta seção nos favoritos' },

  // What is StowStack (new intro section)
  sec_what_is: { en: 'What is StowStack?', pt: 'O que é o StowStack?' },
  what_is_p1: {
    en: 'StowStack is a full-funnel acquisition and conversion system built specifically for independent self-storage operators — typically owners of 1 to 20 facilities. We are not an agency and not a generic SaaS platform. We build ad-specific landing pages with embedded reservation/move-in flows, provide full-funnel attribution (from ad click to signed lease), and run revenue-based A/B testing to continuously improve results.',
    pt: 'O StowStack é um sistema completo de aquisição e conversão construído especificamente para operadores independentes de self storage — geralmente proprietários de 1 a 20 unidades. Não somos uma agência e nem uma plataforma SaaS genérica. Construímos landing pages específicas para anúncios com fluxos de reserva/mudança integrados, oferecemos atribuição completa do funil (do clique no anúncio ao contrato assinado) e executamos testes A/B baseados em receita para melhorar continuamente os resultados.'
  },
  what_is_p2: {
    en: 'Our clients are self-storage facility owners who struggle to fill vacant units. They may be running Google or Facebook ads that send traffic to their generic website, losing potential tenants because there is no clear path from the ad to a reservation. StowStack solves this by giving each ad campaign its own high-converting landing page with an embedded storEDGE rental widget, so the customer can reserve a unit without ever leaving the page.',
    pt: 'Nossos clientes são proprietários de unidades de self storage que têm dificuldade em preencher unidades vagas. Eles podem estar rodando anúncios no Google ou Facebook que enviam tráfego para o site genérico deles, perdendo potenciais inquilinos porque não há um caminho claro do anúncio até a reserva. O StowStack resolve isso dando a cada campanha de anúncios sua própria landing page de alta conversão com o widget de aluguel storEDGE integrado, para que o cliente possa reservar uma unidade sem sair da página.'
  },
  what_is_p3: {
    en: 'The business model: clients pay a monthly management fee plus their ad spend. We handle everything — campaign strategy, landing page creation, ad creative, tracking, and optimization. Your role as admin is to manage the lead pipeline, onboard new clients, enter campaign performance data, build landing pages, and keep the system running smoothly.',
    pt: 'O modelo de negócio: os clientes pagam uma taxa mensal de gestão mais o gasto com anúncios. Nós cuidamos de tudo — estratégia de campanha, criação de landing pages, criativos de anúncios, rastreamento e otimização. Seu papel como admin é gerenciar o pipeline de leads, fazer o onboarding de novos clientes, inserir dados de performance de campanha, construir landing pages e manter o sistema funcionando sem problemas.'
  },
  what_is_p4: {
    en: 'Key metrics we track for every client: CPL (Cost Per Lead — how much we spend per inquiry), ROAS (Return On Ad Spend — revenue generated divided by ad spend), conversion rate (what percentage of leads become paying tenants), and move-ins (actual new tenants who signed a lease). These numbers tell us whether the campaigns are working and where to optimize.',
    pt: 'Métricas principais que rastreamos para cada cliente: CPL (Custo Por Lead — quanto gastamos por consulta), ROAS (Retorno Sobre Gasto com Anúncios — receita gerada dividida pelo gasto com anúncios), taxa de conversão (qual porcentagem de leads se tornam inquilinos pagantes) e mudanças (novos inquilinos que realmente assinaram um contrato). Esses números nos dizem se as campanhas estão funcionando e onde otimizar.'
  },
  what_is_industry: {
    en: 'Self-storage industry context: the US has ~60,000 self-storage facilities. Most independent operators compete against REITs (Public Storage, Extra Space, CubeSmart) that have massive marketing budgets. Our edge is speed, personalization, and direct attribution — we can launch a campaign with a custom landing page in days, not months, and prove exactly which ads are driving revenue.',
    pt: 'Contexto da indústria de self storage: os EUA têm ~60.000 unidades de self storage. A maioria dos operadores independentes compete contra REITs (Public Storage, Extra Space, CubeSmart) que têm orçamentos de marketing enormes. Nosso diferencial é velocidade, personalização e atribuição direta — podemos lançar uma campanha com uma landing page personalizada em dias, não meses, e provar exatamente quais anúncios estão gerando receita.'
  },

  // Section titles
  sec_overview: { en: 'Overview', pt: 'Visão Geral' },
  sec_pipeline: { en: 'Pipeline Management', pt: 'Gestão do Pipeline' },
  sec_kanban: { en: 'Kanban Board', pt: 'Quadro Kanban' },
  sec_onboarding: { en: 'Client Onboarding', pt: 'Onboarding do Cliente' },
  sec_facilities: { en: 'Facilities Management', pt: 'Gestão de Unidades' },
  sec_landing_pages: { en: 'Landing Pages', pt: 'Landing Pages' },
  sec_portfolio: { en: 'Portfolio & Insights', pt: 'Portfólio e Análises' },
  sec_billing: { en: 'Billing', pt: 'Faturamento' },
  sec_settings: { en: 'Settings & Configuration', pt: 'Configurações' },
  sec_integrations: { en: 'Meta & Google Integration', pt: 'Integração Meta e Google' },
  sec_shortcuts: { en: 'Keyboard Shortcuts', pt: 'Atalhos de Teclado' },
  sec_assets: { en: 'Assets & Creative', pt: 'Recursos e Criativos' },

  // Overview section
  overview_p1: {
    en: 'The StowStack Admin Dashboard is your operations hub for managing every client and lead in the system. From here you manage the full lifecycle: lead intake, onboarding, campaign data entry, landing page creation, billing, and portfolio-level performance analytics. Think of it as mission control — every interaction between StowStack and our clients flows through this dashboard.',
    pt: 'O Painel Admin do StowStack é o seu centro de operações para gerenciar todos os clientes e leads do sistema. Daqui você gerencia todo o ciclo: captação de leads, onboarding, entrada de dados de campanha, criação de landing pages, faturamento e análise de performance do portfólio. Pense nele como o centro de comando — toda interação entre o StowStack e nossos clientes passa por este painel.'
  },
  overview_p2: {
    en: 'The dashboard is organized into tabs — Pipeline, Kanban, Portfolio, Insights, Billing, Settings, and Facilities — each covering a specific part of daily operations. The Pipeline and Kanban tabs manage leads (potential clients who filled out our audit form). The Facilities tab manages signed clients and their campaign data. Portfolio and Insights give you a bird\'s-eye view of how all clients are performing.',
    pt: 'O painel é organizado em abas — Pipeline, Kanban, Portfólio, Análises, Faturamento, Configurações e Unidades — cada uma cobrindo uma parte específica das operações diárias. As abas Pipeline e Kanban gerenciam leads (potenciais clientes que preencheram nosso formulário de auditoria). A aba Unidades gerencia clientes assinados e seus dados de campanha. Portfólio e Análises dão uma visão panorâmica de como todos os clientes estão performando.'
  },
  overview_p3: {
    en: 'Daily workflow: most of your time will be spent in the Pipeline tab reviewing new leads, following up, and moving them through the sales process. When a client signs on, you switch to the Facilities tab to set up their facility, build their landing pages, and start entering monthly campaign data. Periodically check Portfolio to make sure no client is underperforming.',
    pt: 'Fluxo de trabalho diário: a maior parte do seu tempo será gasto na aba Pipeline revisando novos leads, fazendo follow-up e movendo-os pelo processo de vendas. Quando um cliente assina, você muda para a aba Unidades para configurar a unidade dele, construir as landing pages e começar a inserir dados mensais de campanha. Verifique periodicamente o Portfólio para garantir que nenhum cliente esteja com performance baixa.'
  },
  overview_tabs_title: { en: 'Tab Reference', pt: 'Referência das Abas' },
  overview_tab_pipeline: {
    en: 'Pipeline — Your inbox for leads. Every person who submits the free audit form lands here. This is where you spend most of your time managing the sales process.',
    pt: 'Pipeline — Sua caixa de entrada de leads. Toda pessoa que envia o formulário de auditoria gratuita aparece aqui. É onde você passa a maior parte do tempo gerenciando o processo de vendas.'
  },
  overview_tab_kanban: {
    en: 'Kanban — Visual board version of the Pipeline. Same leads, same data, but displayed as drag-and-drop columns. Great for weekly reviews and seeing the big picture at a glance.',
    pt: 'Kanban — Versão em quadro visual do Pipeline. Mesmos leads, mesmos dados, mas exibidos como colunas de arrastar e soltar. Ótimo para revisões semanais e ver o panorama geral rapidamente.'
  },
  overview_tab_portfolio: {
    en: 'Portfolio — Shows all signed clients in one view with their key campaign metrics (spend, leads, move-ins, CPL, ROAS). Use this to spot clients who need attention.',
    pt: 'Portfólio — Mostra todos os clientes assinados em uma visualização com suas métricas principais de campanha (gasto, leads, mudanças, CPL, ROAS). Use para identificar clientes que precisam de atenção.'
  },
  overview_tab_insights: {
    en: 'Insights — Aggregate analytics across all clients. Total spend, total leads, average CPL, trends over time. Use for business-level reporting.',
    pt: 'Análises — Métricas agregadas de todos os clientes. Gasto total, total de leads, CPL médio, tendências ao longo do tempo. Use para relatórios no nível de negócio.'
  },
  overview_tab_billing: {
    en: 'Billing — Track invoices, payments, and overdue balances for each client. Management fees and ad spend tracked separately.',
    pt: 'Faturamento — Acompanhe faturas, pagamentos e saldos em atraso de cada cliente. Taxas de gestão e gasto com anúncios rastreados separadamente.'
  },
  overview_tab_settings: {
    en: 'Settings — Company info, notification preferences, dark mode, and system defaults.',
    pt: 'Configurações — Informações da empresa, preferências de notificação, modo escuro e padrões do sistema.'
  },
  overview_tab_facilities: {
    en: 'Facilities — The command center for signed clients. Each facility has its campaign data, landing pages, and performance history. This is where you enter the monthly numbers that power all the dashboards and client reports.',
    pt: 'Unidades — O centro de comando para clientes assinados. Cada unidade tem seus dados de campanha, landing pages e histórico de performance. É aqui que você insere os números mensais que alimentam todos os painéis e relatórios dos clientes.'
  },
  overview_media: {
    en: 'Admin dashboard overview — Pipeline tab with lead cards and stats',
    pt: 'Visão geral do painel admin — aba Pipeline com cards de leads e estatísticas'
  },
  overview_info: {
    en: 'Access the admin dashboard at',
    pt: 'Acesse o painel admin em'
  },
  overview_info2: {
    en: '. Authentication uses a header key stored in your browser. If your session expires, you will be prompted to re-enter the admin key.',
    pt: '. A autenticação usa uma chave de cabeçalho armazenada no seu navegador. Se sua sessão expirar, será solicitado que você insira novamente a chave admin.'
  },

  // Pipeline section
  pipeline_intro: {
    en: 'The Pipeline tab is your primary workspace and where you will spend most of your time. Every lead that submits the free facility audit form on our website (stowstack.co) appears here automatically. A "lead" is a self-storage facility owner who is interested in our services — they want help filling their vacant units through paid advertising.',
    pt: 'A aba Pipeline é seu espaço de trabalho principal e onde você passará a maior parte do tempo. Todo lead que envia o formulário gratuito de auditoria de unidade no nosso site (stowstack.co) aparece aqui automaticamente. Um "lead" é um proprietário de unidade de self storage que está interessado nos nossos serviços — eles querem ajuda para preencher suas unidades vagas através de publicidade paga.'
  },
  pipeline_intro2: {
    en: 'Each lead moves through a defined status workflow from "Submitted" to "Signed" (or "Lost"). Your job is to guide them through this process: review their submission, send them the onboarding form, generate their facility audit, schedule a call, and close the deal. The faster you respond to new leads, the higher the close rate — aim to follow up within 24 hours of submission.',
    pt: 'Cada lead avança por um fluxo de status definido de "Enviado" até "Assinado" (ou "Perdido"). Seu trabalho é guiá-los por esse processo: revisar o envio, enviar o formulário de onboarding, gerar a auditoria da unidade, agendar uma reunião e fechar o negócio. Quanto mais rápido você responder a novos leads, maior a taxa de fechamento — tente fazer follow-up em até 24 horas após o envio.'
  },
  pipeline_walkthrough: {
    en: 'Pipeline tab → click any lead card to expand',
    pt: 'Aba Pipeline → clique em qualquer card de lead para expandir'
  },
  pipeline_status_title: { en: 'Lead Status Workflow', pt: 'Fluxo de Status do Lead' },

  // Status flow
  status_submitted: { en: 'Submitted', pt: 'Enviado' },
  status_submitted_desc: {
    en: 'Lead just came in from the audit intake form on our website. They filled out their facility name, location, current occupancy, and biggest challenge. Review this info and respond quickly — this is your first impression.',
    pt: 'Lead acabou de chegar pelo formulário de auditoria do nosso site. Eles preencheram nome da unidade, localização, ocupação atual e maior desafio. Revise essas informações e responda rapidamente — essa é sua primeira impressão.'
  },
  status_form_sent: { en: 'Form Sent', pt: 'Formulário Enviado' },
  status_form_sent_desc: {
    en: 'You emailed them the portal link (stowstack.co/portal) and their unique access code. They now need to complete the 5-step onboarding wizard with detailed facility info. Follow up if they haven\'t completed it within 3 days.',
    pt: 'Você enviou por e-mail o link do portal (stowstack.co/portal) e o código de acesso exclusivo. Agora eles precisam completar o assistente de onboarding de 5 etapas com informações detalhadas da unidade. Faça follow-up se não completarem em 3 dias.'
  },
  status_form_done: { en: 'Form Done', pt: 'Formulário Completo' },
  status_form_done_desc: {
    en: 'Client completed the onboarding wizard — we now have their facility details, demographics, unit mix, competitor info, and ad preferences. Use this data to build their personalized facility audit and campaign proposal.',
    pt: 'O cliente completou o assistente de onboarding — agora temos os detalhes da unidade, demografia, mix de unidades, informações de concorrentes e preferências de anúncios. Use esses dados para construir a auditoria personalizada da unidade e a proposta de campanha.'
  },
  status_audit_ready: { en: 'Audit Ready', pt: 'Auditoria Pronta' },
  status_audit_ready_desc: {
    en: 'You generated their facility audit / campaign proposal showing market analysis, recommended ad strategy, expected CPL, and projected move-ins. This document is what we present on the sales call to close the deal.',
    pt: 'Você gerou a auditoria da unidade / proposta de campanha mostrando análise de mercado, estratégia de anúncios recomendada, CPL esperado e mudanças projetadas. Este documento é o que apresentamos na reunião de vendas para fechar o negócio.'
  },
  status_call_set: { en: 'Call Set', pt: 'Reunião Agendada' },
  status_call_set_desc: {
    en: 'Discovery or close call is scheduled. On this call, walk the client through the audit, explain how StowStack works, answer questions, and present pricing. The goal is to get them to sign on.',
    pt: 'Reunião de descoberta ou fechamento agendada. Nessa reunião, apresente a auditoria ao cliente, explique como o StowStack funciona, responda perguntas e apresente os preços. O objetivo é fazê-lo assinar.'
  },
  status_signed: { en: 'Signed', pt: 'Assinado' },
  status_signed_desc: {
    en: 'Client signed on — active account! Now set up their facility in the Facilities tab, build their first landing page, connect their ad accounts, and start running campaigns. This is where the real work begins.',
    pt: 'Cliente assinou — conta ativa! Agora configure a unidade na aba Unidades, construa a primeira landing page, conecte as contas de anúncios e comece a rodar as campanhas. É aqui que o trabalho real começa.'
  },
  status_lost: { en: 'Lost', pt: 'Perdido' },
  status_lost_desc: {
    en: 'Lead did not convert. Always record the reason in notes (too expensive, went with competitor, not ready, etc.). This data helps us improve our pitch and pricing over time.',
    pt: 'Lead não converteu. Sempre registre o motivo nas anotações (muito caro, foi com concorrente, não está pronto, etc.). Esses dados nos ajudam a melhorar nossa proposta e preços ao longo do tempo.'
  },

  // Working with leads
  pipeline_working_title: { en: 'Working with Leads', pt: 'Trabalhando com Leads' },
  pipeline_step1: {
    en: 'Click any lead card to expand it and see full details, notes, and actions.',
    pt: 'Clique em qualquer card de lead para expandir e ver detalhes completos, anotações e ações.'
  },
  pipeline_step2: {
    en: 'Use the status dropdown to advance a lead to the next stage.',
    pt: 'Use o dropdown de status para avançar o lead para a próxima etapa.'
  },
  pipeline_step3: {
    en: 'Add internal notes with timestamps — these are only visible to admins.',
    pt: 'Adicione anotações internas com data/hora — elas são visíveis apenas para administradores.'
  },
  pipeline_step4: {
    en: 'Set follow-up dates. Overdue leads automatically sort to the top and show a warning badge.',
    pt: 'Defina datas de acompanhamento. Leads em atraso são automaticamente classificados no topo e exibem um alerta.'
  },

  // Bulk actions
  pipeline_bulk_title: { en: 'Bulk Actions', pt: 'Ações em Massa' },
  pipeline_bulk1: {
    en: 'Use the checkbox on each lead card to select multiple leads.',
    pt: 'Use a caixa de seleção em cada card de lead para selecionar múltiplos leads.'
  },
  pipeline_bulk2: {
    en: 'The bulk action bar appears at the top — choose a target status and apply to all selected leads at once.',
    pt: 'A barra de ação em massa aparece no topo — escolha um status de destino e aplique a todos os leads selecionados de uma vez.'
  },

  // Search & filter
  pipeline_search_title: { en: 'Search & Filter', pt: 'Busca e Filtros' },
  pipeline_search_desc: {
    en: 'Use the search bar to find leads by name, facility name, location, or email. Use the pipeline stage chips to filter by status. The "Overdue" chip shows only leads with past-due follow-up dates.',
    pt: 'Use a barra de busca para encontrar leads por nome, nome da unidade, localização ou e-mail. Use as etiquetas de etapa do pipeline para filtrar por status. A etiqueta "Atrasado" mostra apenas leads com datas de acompanhamento vencidas.'
  },
  pipeline_media: {
    en: 'Pipeline view — expanded lead card with notes and status controls',
    pt: 'Visão do Pipeline — card de lead expandido com anotações e controles de status'
  },
  pipeline_info: {
    en: 'Press',
    pt: 'Pressione'
  },
  pipeline_info2: {
    en: 'to open the command palette for quick lead search and navigation across all tabs.',
    pt: 'para abrir a paleta de comandos para busca rápida de leads e navegação entre todas as abas.'
  },

  // Kanban
  kanban_intro: {
    en: 'The Kanban tab shows the exact same leads as the Pipeline tab, but displayed as a visual board with columns for each status. Each column (Submitted, Form Sent, Form Done, etc.) contains cards for leads in that stage. This view is especially useful for weekly team reviews — you can instantly see how many leads are in each stage, spot bottlenecks (too many leads stuck in "Form Sent"?), and drag cards between columns to update their status.',
    pt: 'A aba Kanban mostra exatamente os mesmos leads da aba Pipeline, mas exibidos como um quadro visual com colunas para cada status. Cada coluna (Enviado, Formulário Enviado, Formulário Completo, etc.) contém cards dos leads naquela etapa. Essa visualização é especialmente útil para revisões semanais da equipe — você pode ver instantaneamente quantos leads estão em cada etapa, identificar gargalos (muitos leads parados em "Formulário Enviado"?) e arrastar cards entre colunas para atualizar o status.'
  },
  kanban_intro2: {
    en: 'When to use Kanban vs Pipeline: Use the Pipeline tab for daily work — reviewing individual leads, adding notes, and managing follow-ups. Use the Kanban tab for weekly overviews and to quickly move multiple leads between stages. Both views update the same data, so changes in one appear in the other.',
    pt: 'Quando usar Kanban vs Pipeline: Use a aba Pipeline para o trabalho diário — revisar leads individuais, adicionar anotações e gerenciar follow-ups. Use a aba Kanban para visões gerais semanais e para mover rapidamente múltiplos leads entre etapas. Ambas as visualizações atualizam os mesmos dados, então mudanças em uma aparecem na outra.'
  },
  kanban_walkthrough: {
    en: 'Kanban tab → drag cards between columns to update status',
    pt: 'Aba Kanban → arraste os cards entre colunas para atualizar o status'
  },
  kanban_step1: {
    en: 'Each column represents a pipeline status (Submitted, Form Sent, Form Done, etc.).',
    pt: 'Cada coluna representa um status do pipeline (Enviado, Formulário Enviado, Formulário Completo, etc.).'
  },
  kanban_step2: {
    en: 'Drag and drop lead cards between columns to update their status instantly.',
    pt: 'Arraste e solte os cards de leads entre as colunas para atualizar o status instantaneamente.'
  },
  kanban_step3: {
    en: 'Click any card to expand it and view/edit details, same as in the Pipeline tab.',
    pt: 'Clique em qualquer card para expandir e ver/editar detalhes, igual à aba Pipeline.'
  },
  kanban_media: {
    en: 'Kanban board — drag-and-drop lead cards between status columns',
    pt: 'Quadro Kanban — arraste e solte cards de leads entre colunas de status'
  },
  kanban_info: {
    en: 'The Kanban view is best for weekly pipeline reviews — scan left to right to see how leads are progressing through the funnel.',
    pt: 'A visão Kanban é ideal para revisões semanais do pipeline — escaneie da esquerda para a direita para ver como os leads estão progredindo pelo funil.'
  },

  // Client Onboarding
  onboarding_intro: {
    en: 'Onboarding is the process of turning a lead (someone who filled out our audit form) into a signed, paying client. This is the most critical workflow in StowStack — every dollar of revenue starts here. The process has 7 steps, and your goal is to move each lead through as quickly and smoothly as possible. The average time from submission to signed client should be 7-14 days.',
    pt: 'Onboarding é o processo de transformar um lead (alguém que preencheu nosso formulário de auditoria) em um cliente assinado e pagante. Este é o fluxo de trabalho mais crítico do StowStack — cada real de receita começa aqui. O processo tem 7 etapas, e seu objetivo é mover cada lead através delas o mais rápido e suavemente possível. O tempo médio do envio até o cliente assinado deve ser de 7 a 14 dias.'
  },
  onboarding_intro2: {
    en: 'The onboarding form that clients fill out collects detailed information we need to build their campaign: facility details (name, address, total units, occupancy rate), local demographics (population, median income, competitors nearby), unit mix (sizes, climate controlled vs drive-up, current pricing), and ad preferences (budget, past advertising experience, goals). This data powers everything — the audit, the landing pages, and the campaign strategy.',
    pt: 'O formulário de onboarding que os clientes preenchem coleta informações detalhadas que precisamos para construir a campanha: detalhes da unidade (nome, endereço, total de unidades, taxa de ocupação), demografia local (população, renda mediana, concorrentes próximos), mix de unidades (tamanhos, climatizada vs drive-up, preços atuais) e preferências de anúncios (orçamento, experiência anterior com publicidade, metas). Esses dados alimentam tudo — a auditoria, as landing pages e a estratégia de campanha.'
  },
  onboarding_title: { en: 'Full Onboarding Workflow', pt: 'Fluxo Completo de Onboarding' },
  onboarding_s1_bold: { en: 'Lead arrives', pt: 'Lead chega' },
  onboarding_s1: {
    en: ' — Review their submission in Pipeline. Check facility name, location, occupancy, and biggest issue.',
    pt: ' — Revise o envio no Pipeline. Verifique o nome da unidade, localização, ocupação e principal problema.'
  },
  onboarding_s2_bold: { en: 'Generate access code', pt: 'Gere o código de acesso' },
  onboarding_s2: {
    en: ' — Create or copy the client access code from the lead card. This code lets the client log into the portal.',
    pt: ' — Crie ou copie o código de acesso do cliente a partir do card do lead. Esse código permite que o cliente acesse o portal.'
  },
  onboarding_s3_bold: { en: 'Send onboarding form', pt: 'Envie o formulário de onboarding' },
  onboarding_s3: {
    en: ' — Email the client their portal link (',
    pt: ' — Envie por e-mail o link do portal do cliente ('
  },
  onboarding_s3b: {
    en: ') and access code. Move status to "Form Sent".',
    pt: ') e o código de acesso. Mova o status para "Formulário Enviado".'
  },
  onboarding_s4_bold: { en: 'Client completes wizard', pt: 'Cliente completa o assistente' },
  onboarding_s4: {
    en: ' — They fill out the 5-step onboarding wizard (facility details, demographics, unit mix, competitors, ad preferences). Status auto-updates to "Form Done".',
    pt: ' — Ele preenche o assistente de onboarding de 5 etapas (detalhes da unidade, demografia, mix de unidades, concorrentes, preferências de anúncios). O status atualiza automaticamente para "Formulário Completo".'
  },
  onboarding_s5_bold: { en: 'Generate audit', pt: 'Gere a auditoria' },
  onboarding_s5: {
    en: ' — Use the onboarding data to build the facility audit / campaign proposal. Move status to "Audit Ready".',
    pt: ' — Use os dados do onboarding para construir a auditoria da unidade / proposta de campanha. Mova o status para "Auditoria Pronta".'
  },
  onboarding_s6_bold: { en: 'Schedule call', pt: 'Agende a reunião' },
  onboarding_s6: {
    en: ' — Set a follow-up date and book a discovery or close call. Move to "Call Set".',
    pt: ' — Defina uma data de acompanhamento e agende uma reunião de descoberta ou fechamento. Mova para "Reunião Agendada".'
  },
  onboarding_s7_bold: { en: 'Close and activate', pt: 'Feche e ative' },
  onboarding_s7: {
    en: ' — When the client signs on, move to "Signed". Set up their facility in the Facilities tab and begin entering campaign data.',
    pt: ' — Quando o cliente assinar, mova para "Assinado". Configure a unidade na aba Unidades e comece a inserir os dados de campanha.'
  },
  onboarding_info: {
    en: 'Always add a note when changing status — this creates an audit trail and helps the team understand where each lead stands.',
    pt: 'Sempre adicione uma anotação ao mudar o status — isso cria um histórico de auditoria e ajuda a equipe a entender onde cada lead está.'
  },

  // Facilities
  facilities_intro: {
    en: "The Facilities tab is where you manage each signed client's facility data. A \"facility\" in StowStack represents one physical self-storage location — a client might own multiple facilities, and each one is managed separately with its own campaign data, landing pages, and performance metrics. This is the heart of the system after a client signs on.",
    pt: 'A aba Unidades é onde você gerencia os dados de cada unidade de cliente assinado. Uma "unidade" no StowStack representa uma localização física de self storage — um cliente pode ter múltiplas unidades, e cada uma é gerenciada separadamente com seus próprios dados de campanha, landing pages e métricas de performance. Este é o coração do sistema depois que um cliente assina.'
  },
  facilities_intro2: {
    en: "Why this matters: the campaign data you enter here (ad spend, leads, move-ins, revenue) is what populates everything — the client's portal dashboard with their charts and KPIs, the portfolio-level analytics, and the monthly performance digest. If the numbers are wrong or missing, the client sees inaccurate data. Enter data carefully and keep it updated monthly.",
    pt: 'Por que isso importa: os dados de campanha que você insere aqui (gasto com anúncios, leads, mudanças, receita) são o que alimenta tudo — o painel do portal do cliente com seus gráficos e KPIs, as análises no nível do portfólio e o relatório mensal de performance. Se os números estiverem errados ou faltando, o cliente vê dados imprecisos. Insira os dados com cuidado e mantenha-os atualizados mensalmente.'
  },
  facilities_walkthrough: {
    en: 'Facilities tab → click a facility row to open its detail view',
    pt: 'Aba Unidades → clique em uma linha de unidade para abrir a visão detalhada'
  },
  facilities_setup_title: { en: 'Setting Up a New Facility', pt: 'Configurando uma Nova Unidade' },
  facilities_setup1: {
    en: 'Navigate to the Facilities tab and click "Add Facility".',
    pt: 'Navegue até a aba Unidades e clique em "Adicionar Unidade".'
  },
  facilities_setup2: {
    en: 'Enter the facility name, location, contact information, and any notes.',
    pt: 'Insira o nome da unidade, localização, informações de contato e observações.'
  },
  facilities_setup3: {
    en: 'Link the facility to the signed lead so their onboarding data carries over.',
    pt: 'Vincule a unidade ao lead assinado para que os dados de onboarding sejam transferidos.'
  },
  facilities_data_title: { en: 'Entering Campaign Data', pt: 'Inserindo Dados de Campanha' },
  facilities_data1: {
    en: 'Open a facility and navigate to its campaign performance section.',
    pt: 'Abra uma unidade e navegue até a seção de performance de campanha.'
  },
  facilities_data2: {
    en: 'Add monthly data: ad spend, leads, move-ins, and revenue generated.',
    pt: 'Adicione os dados mensais: gasto com anúncios, leads, mudanças e receita gerada.'
  },
  facilities_data3: {
    en: 'The system automatically calculates CPL, ROAS, and conversion rates from the raw numbers.',
    pt: 'O sistema calcula automaticamente CPL, ROAS e taxas de conversão a partir dos números brutos.'
  },
  facilities_data4: {
    en: "This data populates the client's portal dashboard, charts, and performance digest.",
    pt: 'Esses dados alimentam o painel do portal do cliente, gráficos e relatório de performance.'
  },
  facilities_media: {
    en: 'Facility detail view — campaign data table and performance charts',
    pt: 'Visão detalhada da unidade — tabela de dados de campanha e gráficos de performance'
  },
  facilities_lp_title: { en: 'Landing Pages per Facility', pt: 'Landing Pages por Unidade' },
  facilities_lp_desc: {
    en: 'Each facility can have multiple ad-specific landing pages. See the Landing Pages section below for details on creating and managing these.',
    pt: 'Cada unidade pode ter múltiplas landing pages específicas para anúncios. Veja a seção Landing Pages abaixo para detalhes sobre criação e gerenciamento.'
  },

  // Landing pages
  lp_intro: {
    en: 'Landing pages are the core product that StowStack delivers to clients. Every ad campaign should have its own dedicated landing page — never send ad traffic to a generic website. Why? Because a landing page is designed for one specific goal: get the visitor to reserve a unit. It has targeted messaging that matches the ad they clicked, social proof (testimonials, trust badges), clear pricing, and most importantly, an embedded storEDGE rental widget that lets them reserve a unit right on the page without navigating away.',
    pt: 'Landing pages são o produto central que o StowStack entrega aos clientes. Toda campanha de anúncios deve ter sua própria landing page dedicada — nunca envie tráfego de anúncios para um site genérico. Por quê? Porque uma landing page é projetada para um objetivo específico: fazer o visitante reservar uma unidade. Ela tem mensagens direcionadas que combinam com o anúncio que eles clicaram, prova social (depoimentos, selos de confiança), preços claros e, mais importante, um widget de aluguel storEDGE integrado que permite reservar uma unidade direto na página sem navegar para outro lugar.'
  },
  lp_intro2: {
    en: 'This is what makes StowStack different from agencies: we don\'t just run ads, we control the entire experience from ad click to signed lease. A typical independent storage operator sends Google Ad traffic to their homepage, where the visitor gets lost in navigation. Our approach: each ad links to a purpose-built page with one clear call-to-action. This typically improves conversion rates by 3-5x.',
    pt: 'Isso é o que torna o StowStack diferente das agências: nós não apenas rodamos anúncios, controlamos toda a experiência do clique no anúncio até o contrato assinado. Um operador de storage independente típico envia tráfego do Google Ads para a homepage, onde o visitante se perde na navegação. Nossa abordagem: cada anúncio leva a uma página construída com propósito específico e uma chamada para ação clara. Isso normalmente melhora as taxas de conversão em 3-5x.'
  },
  lp_walkthrough: {
    en: 'Facilities tab → open a facility → Landing Pages section → Create Page',
    pt: 'Aba Unidades → abra uma unidade → seção Landing Pages → Criar Página'
  },
  lp_create_title: { en: 'Creating a Landing Page', pt: 'Criando uma Landing Page' },
  lp_create1: {
    en: 'Open a facility, then navigate to its Landing Pages section.',
    pt: 'Abra uma unidade e navegue até a seção Landing Pages.'
  },
  lp_create2: {
    en: 'Click "Create Page" to start a new page with a unique slug (this becomes the URL path at',
    pt: 'Clique em "Criar Página" para iniciar uma nova página com um slug único (este se torna o caminho da URL em'
  },
  lp_create3: {
    en: 'Add sections using the section builder: Hero, Trust Bar, Features, Unit Types, Gallery, Testimonials, FAQ, CTA, and Location Map.',
    pt: 'Adicione seções usando o construtor de seções: Hero, Barra de Confiança, Recursos, Tipos de Unidade, Galeria, Depoimentos, FAQ, CTA e Mapa de Localização.'
  },
  lp_create4: {
    en: 'Configure each section — headlines, copy, images, unit data, and styling.',
    pt: 'Configure cada seção — títulos, textos, imagens, dados de unidades e estilo.'
  },
  lp_create5: {
    en: 'Use the preview mode to see the page on desktop and mobile before publishing.',
    pt: 'Use o modo de visualização para ver a página no desktop e mobile antes de publicar.'
  },
  lp_sections_title: { en: 'Section Types', pt: 'Tipos de Seção' },
  lp_hero: { en: 'Hero', pt: 'Hero' },
  lp_hero_desc: { en: 'Main headline, CTA, and background', pt: 'Título principal, CTA e fundo' },
  lp_trust: { en: 'Trust Bar', pt: 'Barra de Confiança' },
  lp_trust_desc: { en: 'Short proof points / badges', pt: 'Pontos de prova curtos / selos' },
  lp_features: { en: 'Features', pt: 'Recursos' },
  lp_features_desc: { en: 'Facility selling points', pt: 'Diferenciais da unidade' },
  lp_units: { en: 'Unit Types', pt: 'Tipos de Unidade' },
  lp_units_desc: { en: 'Available units with pricing', pt: 'Unidades disponíveis com preços' },
  lp_gallery: { en: 'Gallery', pt: 'Galeria' },
  lp_gallery_desc: { en: 'Facility photos', pt: 'Fotos da unidade' },
  lp_testimonials: { en: 'Testimonials', pt: 'Depoimentos' },
  lp_testimonials_desc: { en: 'Customer reviews', pt: 'Avaliações de clientes' },
  lp_faq: { en: 'FAQ', pt: 'FAQ' },
  lp_faq_desc: { en: 'Common questions', pt: 'Perguntas frequentes' },
  lp_cta: { en: 'CTA', pt: 'CTA' },
  lp_cta_desc: { en: 'Call-to-action with phone/form', pt: 'Chamada para ação com telefone/formulário' },
  lp_location: { en: 'Location Map', pt: 'Mapa de Localização' },
  lp_location_desc: { en: 'Address and directions', pt: 'Endereço e como chegar' },
  lp_media: {
    en: 'Landing page builder — section editor with live preview',
    pt: 'Construtor de landing page — editor de seções com visualização ao vivo'
  },
  lp_publish_title: { en: 'Publishing & Variations', pt: 'Publicação e Variações' },
  lp_publish_desc: {
    en: 'Pages start in draft status. Once ready, publish the page to make it live. You can create multiple variations of a page for A/B testing — each variation gets its own slug and can have different headlines, offers, or layouts.',
    pt: 'As páginas iniciam como rascunho. Quando estiver pronta, publique para torná-la ativa. Você pode criar múltiplas variações de uma página para testes A/B — cada variação recebe seu próprio slug e pode ter títulos, ofertas ou layouts diferentes.'
  },
  lp_info: {
    en: 'Each landing page embeds the storEDGE rental widget so customers can reserve a unit without ever leaving the page. Configure the storEDGE widget ID in the page theme settings.',
    pt: 'Cada landing page incorpora o widget de aluguel storEDGE para que os clientes possam reservar uma unidade sem sair da página. Configure o ID do widget storEDGE nas configurações de tema da página.'
  },

  // Portfolio
  portfolio_view_title: { en: 'Portfolio View', pt: 'Visão do Portfólio' },
  portfolio_view_desc: {
    en: 'The Portfolio tab shows a cross-client view of all signed facilities. Each client card shows their campaign performance — total spend, leads, move-ins, CPL, and ROAS. Use this to spot which clients need attention and which are performing well. A healthy client typically has a CPL under $50 and ROAS above 4x. If you see a client with CPL over $80 or ROAS under 2x, flag it — their campaigns may need optimization.',
    pt: 'A aba Portfólio mostra uma visão cruzada de todas as unidades assinadas. Cada card de cliente mostra a performance da campanha — gasto total, leads, mudanças, CPL e ROAS. Use para identificar quais clientes precisam de atenção e quais estão performando bem. Um cliente saudável geralmente tem CPL abaixo de $50 e ROAS acima de 4x. Se você ver um cliente com CPL acima de $80 ou ROAS abaixo de 2x, sinalize — as campanhas podem precisar de otimização.'
  },
  portfolio_metrics_title: { en: 'Understanding the Metrics', pt: 'Entendendo as Métricas' },
  portfolio_metrics_desc: {
    en: 'CPL (Cost Per Lead) = total ad spend ÷ number of leads. Lower is better — it means we\'re getting inquiries cheaply. ROAS (Return On Ad Spend) = revenue from move-ins ÷ ad spend. Higher is better — a 6x ROAS means for every $1 spent on ads, the client earned $6 in rental revenue. Conversion Rate = move-ins ÷ leads. This tells us how good the facility is at converting inquiries into signed leases. If conversion is low but CPL is good, the issue is usually the facility\'s sales process, not our ads.',
    pt: 'CPL (Custo Por Lead) = gasto total com anúncios ÷ número de leads. Quanto menor, melhor — significa que estamos conseguindo consultas a baixo custo. ROAS (Retorno Sobre Gasto com Anúncios) = receita de mudanças ÷ gasto com anúncios. Quanto maior, melhor — um ROAS de 6x significa que para cada $1 gasto em anúncios, o cliente ganhou $6 em receita de aluguel. Taxa de Conversão = mudanças ÷ leads. Isso nos diz quão boa a unidade é em converter consultas em contratos assinados. Se a conversão é baixa mas o CPL é bom, o problema geralmente é o processo de vendas da unidade, não nossos anúncios.'
  },
  insights_view_title: { en: 'Insights View', pt: 'Visão de Análises' },
  insights_view_desc: {
    en: 'The Insights tab provides aggregate analytics across your entire book of business: total ad spend, total leads, average CPL, average ROAS, and trend charts. Use this for business-level reporting and identifying patterns. For example, if average CPL across all clients is rising month-over-month, it may indicate seasonal trends (storage demand is highest in summer, lowest in winter) or market-wide competition increases.',
    pt: 'A aba Análises fornece métricas agregadas de todo o seu portfólio de negócios: gasto total com anúncios, total de leads, CPL médio, ROAS médio e gráficos de tendência. Use para relatórios no nível de negócio e identificação de padrões. Por exemplo, se o CPL médio de todos os clientes está subindo mês a mês, pode indicar tendências sazonais (demanda por storage é maior no verão e menor no inverno) ou aumento de competição no mercado.'
  },
  portfolio_info: {
    en: 'Portfolio data is derived from the campaign data you enter per-facility. Keep monthly numbers up to date for accurate portfolio-level reporting. If data is missing for a month, portfolio totals will be incomplete and could mislead decision-making.',
    pt: 'Os dados do portfólio são derivados dos dados de campanha que você insere por unidade. Mantenha os números mensais atualizados para relatórios precisos no nível do portfólio. Se faltar dados de um mês, os totais do portfólio ficarão incompletos e podem prejudicar a tomada de decisão.'
  },

  // Billing
  billing_intro: {
    en: 'The Billing tab tracks client billing information, invoices, and payment status. Each client has two cost components: (1) the monthly management fee (what they pay StowStack for our services — landing pages, optimization, reporting) and (2) their ad spend (what they pay Google/Facebook directly for running ads). We track both so the client sees a complete picture of their investment, and so we can calculate true ROAS.',
    pt: 'A aba Faturamento rastreia informações de cobrança, faturas e status de pagamento dos clientes. Cada cliente tem dois componentes de custo: (1) a taxa mensal de gestão (o que eles pagam ao StowStack pelos nossos serviços — landing pages, otimização, relatórios) e (2) o gasto com anúncios (o que eles pagam ao Google/Facebook diretamente para rodar anúncios). Rastreamos ambos para que o cliente veja uma visão completa do investimento, e para calcularmos o ROAS real.'
  },
  billing_intro2: {
    en: 'Keeping billing up to date is important for client retention. If a client doesn\'t see value in our reports, they\'ll question the management fee. That\'s why accurate campaign data (entered in the Facilities tab) matters so much — it proves the ROI that justifies our fee.',
    pt: 'Manter o faturamento atualizado é importante para a retenção de clientes. Se um cliente não vê valor nos nossos relatórios, ele vai questionar a taxa de gestão. É por isso que dados precisos de campanha (inseridos na aba Unidades) são tão importantes — eles provam o ROI que justifica nossa taxa.'
  },
  billing_walkthrough: { en: 'Billing tab', pt: 'Aba Faturamento' },
  billing_step1: {
    en: 'Each signed client has a billing card showing their plan, monthly fee, and payment history.',
    pt: 'Cada cliente assinado tem um card de cobrança mostrando seu plano, taxa mensal e histórico de pagamentos.'
  },
  billing_step2: {
    en: 'Track which invoices have been sent, paid, or are overdue.',
    pt: 'Acompanhe quais faturas foram enviadas, pagas ou estão em atraso.'
  },
  billing_step3: {
    en: 'Ad spend is tracked separately from management fees — both roll up into total client cost.',
    pt: 'O gasto com anúncios é rastreado separadamente das taxas de gestão — ambos são somados no custo total do cliente.'
  },

  // Settings
  settings_intro: {
    en: 'The Settings tab controls system-wide configuration for the admin dashboard. These settings affect how the entire system behaves — email signatures on outbound messages, when you get notified about new leads, and visual preferences. Set these up once when you first start, then adjust as needed.',
    pt: 'A aba Configurações controla as configurações do sistema para o painel administrativo. Essas configurações afetam como todo o sistema funciona — assinaturas de e-mail em mensagens enviadas, quando você é notificado sobre novos leads e preferências visuais. Configure uma vez quando começar, depois ajuste conforme necessário.'
  },
  settings_walkthrough: { en: 'Settings tab', pt: 'Aba Configurações' },
  settings_company_title: { en: 'Company Information', pt: 'Informações da Empresa' },
  settings_company_desc: {
    en: 'Set your company name, email, phone, and email signature. These are used in outbound communications and portal branding.',
    pt: 'Defina o nome da empresa, e-mail, telefone e assinatura de e-mail. Estes são usados em comunicações externas e na identidade visual do portal.'
  },
  settings_notif_title: { en: 'Notification Preferences', pt: 'Preferências de Notificação' },
  settings_notif_desc: {
    en: 'Toggle notifications for: new lead submissions, overdue follow-ups, client messages, and campaign alerts (CPL spikes, ROAS drops). Notifications appear via the bell icon in the header.',
    pt: 'Ative/desative notificações para: novos envios de leads, acompanhamentos atrasados, mensagens de clientes e alertas de campanha (picos de CPL, quedas de ROAS). As notificações aparecem pelo ícone de sino no cabeçalho.'
  },
  settings_defaults_title: { en: 'Defaults', pt: 'Padrões' },
  settings_defaults1_bold: { en: 'Default follow-up days', pt: 'Dias padrão de acompanhamento' },
  settings_defaults1: {
    en: ' — How many days after submission to set the initial follow-up date. Default is 3 days.',
    pt: ' — Quantos dias após o envio para definir a data inicial de acompanhamento. O padrão é 3 dias.'
  },
  settings_defaults2_bold: { en: 'Dark mode', pt: 'Modo escuro' },
  settings_defaults2: {
    en: ' — Toggle between light and dark themes. Also available via the moon/sun icon in the header or',
    pt: ' — Alterne entre temas claro e escuro. Também disponível pelo ícone de lua/sol no cabeçalho ou'
  },
  settings_defaults2b: {
    en: 'command palette.',
    pt: 'paleta de comandos.'
  },

  // Integrations
  integrations_intro: {
    en: 'StowStack connects to Meta (Facebook/Instagram) and Google Ads for campaign management and ad publishing. Meta is the company that owns Facebook and Instagram — most of our clients run ads on these platforms to reach people in their local area who are searching for storage or who match our target demographics (recent movers, downsizers, college students, military). Google Ads targets people actively searching for "self storage near me" and similar keywords. Together, these two platforms cover the vast majority of digital advertising for local businesses.',
    pt: 'O StowStack se conecta ao Meta (Facebook/Instagram) e Google Ads para gestão de campanhas e publicação de anúncios. Meta é a empresa que possui o Facebook e Instagram — a maioria dos nossos clientes roda anúncios nessas plataformas para alcançar pessoas na área local que estão buscando storage ou que correspondem à nossa demografia alvo (pessoas em mudança, downsizers, estudantes universitários, militares). O Google Ads tem como alvo pessoas que estão ativamente buscando "self storage perto de mim" e palavras-chave similares. Juntas, essas duas plataformas cobrem a grande maioria da publicidade digital para negócios locais.'
  },
  integrations_intro2: {
    en: 'These integrations allow you to publish ad creative (images, headlines, copy) directly from the StowStack admin dashboard to the client\'s ad accounts, without needing to log into Facebook Ads Manager or Google Ads separately. This saves significant time and keeps everything centralized.',
    pt: 'Essas integrações permitem que você publique criativos de anúncios (imagens, títulos, textos) diretamente do painel admin do StowStack para as contas de anúncios do cliente, sem precisar fazer login no Facebook Ads Manager ou Google Ads separadamente. Isso economiza tempo significativo e mantém tudo centralizado.'
  },
  integrations_env_title: { en: 'Environment Variables', pt: 'Variáveis de Ambiente' },
  integrations_env_desc: {
    en: 'The following environment variables must be configured in Vercel for integrations to work:',
    pt: 'As seguintes variáveis de ambiente devem ser configuradas na Vercel para que as integrações funcionem:'
  },
  integrations_env_meta_app: { en: 'Facebook App ID from Meta for Developers', pt: 'ID do App Facebook do Meta for Developers' },
  integrations_env_meta_secret: { en: 'Facebook App Secret', pt: 'Segredo do App Facebook' },
  integrations_env_meta_token: { en: 'Long-lived access token for the Meta API', pt: 'Token de acesso de longa duração para a API do Meta' },
  integrations_env_google_id: { en: 'Google Ads API client ID', pt: 'ID do cliente da API do Google Ads' },
  integrations_env_google_secret: { en: 'Google Ads API client secret', pt: 'Segredo do cliente da API do Google Ads' },
  integrations_connect_title: { en: 'Connecting Accounts', pt: 'Conectando Contas' },
  integrations_connect1: {
    en: "Navigate to the Publish tab within a facility's ad management area.",
    pt: 'Navegue até a aba Publicar dentro da área de gestão de anúncios de uma unidade.'
  },
  integrations_connect2: {
    en: 'Click "Connect Facebook Account" or "Connect Google Account" to authorize access.',
    pt: 'Clique em "Conectar Conta Facebook" ou "Conectar Conta Google" para autorizar o acesso.'
  },
  integrations_connect3: {
    en: 'Once connected, you can publish ad creative directly from the admin dashboard.',
    pt: 'Uma vez conectado, você pode publicar criativos de anúncios diretamente do painel administrativo.'
  },
  integrations_media: {
    en: 'Meta account connection flow — OAuth authorization screen',
    pt: 'Fluxo de conexão da conta Meta — tela de autorização OAuth'
  },
  integrations_info: {
    en: "Environment variables are set in Vercel under your project's Settings → Environment Variables. Changes take effect on the next deployment.",
    pt: 'As variáveis de ambiente são definidas na Vercel em Configurações do Projeto → Variáveis de Ambiente. As alterações entram em vigor na próxima implantação.'
  },

  // Keyboard shortcuts
  shortcuts_intro: {
    en: 'The admin dashboard supports keyboard shortcuts for fast navigation. These only work when you are not focused on a text input.',
    pt: 'O painel administrativo suporta atalhos de teclado para navegação rápida. Estes funcionam apenas quando você não está focado em um campo de texto.'
  },
  shortcut: { en: 'Shortcut', pt: 'Atalho' },
  action: { en: 'Action', pt: 'Ação' },
  sc_cmd_k: { en: 'Open command palette', pt: 'Abrir paleta de comandos' },
  sc_1: { en: 'Pipeline tab', pt: 'Aba Pipeline' },
  sc_2: { en: 'Kanban tab', pt: 'Aba Kanban' },
  sc_3: { en: 'Portfolio tab', pt: 'Aba Portfólio' },
  sc_4: { en: 'Insights tab', pt: 'Aba Análises' },
  sc_5: { en: 'Billing tab', pt: 'Aba Faturamento' },
  sc_6: { en: 'Settings tab', pt: 'Aba Configurações' },
  sc_h: { en: 'Open admin guide', pt: 'Abrir guia admin' },
  sc_question: { en: 'Show keyboard shortcuts', pt: 'Mostrar atalhos de teclado' },
  sc_n: { en: 'Toggle notifications', pt: 'Alternar notificações' },
  sc_r: { en: 'Refresh lead data', pt: 'Atualizar dados de leads' },
  sc_escape: { en: 'Close modals / command palette', pt: 'Fechar modais / paleta de comandos' },

  // Assets
  assets_intro: {
    en: 'StowStack includes tools for managing ad creative and facility imagery used across landing pages and campaigns. Good imagery is critical — the photos on a landing page and in ad creative directly impact conversion rates. A professional photo of a clean, well-lit storage facility converts significantly better than a blurry phone photo or generic stock image. Always prioritize real facility photos when available.',
    pt: 'O StowStack inclui ferramentas para gerenciar criativos de anúncios e imagens de unidades usadas em landing pages e campanhas. Boas imagens são críticas — as fotos em uma landing page e nos criativos de anúncios impactam diretamente as taxas de conversão. Uma foto profissional de uma unidade de storage limpa e bem iluminada converte significativamente melhor do que uma foto borrada de celular ou imagem genérica de banco. Sempre priorize fotos reais da unidade quando disponíveis.'
  },
  assets_intro2: {
    en: 'Each facility has its own asset library. When you upload photos or scrape them from a facility\'s website, they are stored and associated with that specific facility. You can then use these assets across all of that facility\'s landing pages and ad creative. This means you only need to gather photos once per facility.',
    pt: 'Cada unidade tem sua própria biblioteca de recursos. Quando você faz upload de fotos ou as extrai do site de uma unidade, elas são armazenadas e associadas àquela unidade específica. Você pode então usar esses recursos em todas as landing pages e criativos de anúncios daquela unidade. Isso significa que você só precisa coletar fotos uma vez por unidade.'
  },
  assets_sources_title: { en: 'Asset Sources', pt: 'Fontes de Recursos' },
  assets_upload_bold: { en: 'Drag-and-drop upload', pt: 'Upload arrasta e solta' },
  assets_upload: {
    en: ' — Upload facility photos, logos, and ad creative directly from your computer.',
    pt: ' — Faça upload de fotos da unidade, logos e criativos de anúncios diretamente do seu computador.'
  },
  assets_scraper_bold: { en: 'Website scraper', pt: 'Extrator de website' },
  assets_scraper: {
    en: " — Pull images from a facility's existing website by entering the URL. The scraper extracts all usable images automatically.",
    pt: ' — Extraia imagens do site existente de uma unidade inserindo a URL. O extrator obtém todas as imagens utilizáveis automaticamente.'
  },
  assets_stock_bold: { en: 'Stock library', pt: 'Biblioteca de imagens' },
  assets_stock: {
    en: ' — Browse storage-specific stock photos categorized by unit type (climate controlled, drive-up, vehicle, etc.).',
    pt: ' — Navegue por fotos de banco de imagens específicas para self storage, categorizadas por tipo de unidade (climatizada, drive-up, veículo, etc.).'
  },
  assets_using_title: { en: 'Using Assets', pt: 'Usando os Recursos' },
  assets_using_desc: {
    en: 'Assets are available when building landing page sections (Gallery, Hero backgrounds) and when creating ad creative in the Ad Preview system. Uploaded assets are stored and reusable across pages and campaigns for the same facility.',
    pt: 'Os recursos estão disponíveis ao construir seções de landing page (Galeria, fundos de Hero) e ao criar criativos de anúncios no sistema de Prévia de Anúncios. Os recursos enviados são armazenados e reutilizáveis em páginas e campanhas da mesma unidade.'
  },
  assets_info: {
    en: 'Use high-quality, real facility photos whenever possible. Stock images are good for filling gaps but real photos convert better.',
    pt: 'Use fotos reais e de alta qualidade da unidade sempre que possível. Imagens de banco são boas para preencher lacunas, mas fotos reais convertem melhor.'
  },

  // Changelog
  whatsNew: { en: "What's New", pt: 'Novidades' },
  new: { en: 'New', pt: 'Novo' },
  improved: { en: 'Improved', pt: 'Melhorado' },

  // Changelog items
  cl_13_1: { en: 'Admin Guide with search, bookmarks, and quick-start checklist', pt: 'Guia Admin com busca, favoritos e checklist de início rápido' },
  cl_13_2: { en: 'Contextual help tooltips across admin dashboard', pt: 'Dicas de ajuda contextuais em todo o painel admin' },
  cl_13_3: { en: 'Print-friendly guide export', pt: 'Exportação do guia otimizada para impressão' },
  cl_12_1: { en: 'Facebook data deletion flow and Meta platform compliance', pt: 'Fluxo de exclusão de dados do Facebook e conformidade com a plataforma Meta' },
  cl_12_2: { en: 'Publish This Ad button in Ad Preview tab', pt: 'Botão Publicar Este Anúncio na aba Prévia de Anúncios' },
  cl_12_3: { en: 'Publish tab with Meta and Google Ads platform integration', pt: 'Aba Publicar com integração das plataformas Meta e Google Ads' },
  cl_11_1: { en: 'Deep website scraper for facility images', pt: 'Extrator profundo de imagens de websites de unidades' },
  cl_11_2: { en: 'Storage-specific stock image library', pt: 'Biblioteca de imagens específicas para self storage' },
  cl_11_3: { en: 'Ad preview system with multi-format support', pt: 'Sistema de prévia de anúncios com suporte a múltiplos formatos' },
  cl_11_4: { en: 'Asset management with drag-and-drop upload', pt: 'Gestão de recursos com upload arrasta e solta' },
  cl_10_1: { en: 'Admin dashboard with pipeline, kanban, portfolio, and billing views', pt: 'Painel admin com visões de pipeline, kanban, portfólio e faturamento' },
  cl_10_2: { en: 'Client portal with onboarding wizard', pt: 'Portal do cliente com assistente de onboarding' },
  cl_10_3: { en: 'Landing page builder with section-based architecture', pt: 'Construtor de landing page com arquitetura baseada em seções' },
  cl_10_4: { en: 'Full-funnel attribution and campaign reporting', pt: 'Atribuição full-funnel e relatórios de campanha' },

  // Where to find it
  whereToFind: { en: 'Where to find it', pt: 'Onde encontrar' },
  goThere: { en: 'Go there', pt: 'Ir para lá' },
  comingSoon: { en: 'Coming soon', pt: 'Em breve' },

  // Footer
  footer: {
    en: 'Internal operations guide — not client-facing. Last updated March 2026.',
    pt: 'Guia de operações interno — não voltado ao cliente. Última atualização março de 2026.'
  },
} as const satisfies Record<string, { en: string; pt: string }>

type TKey = keyof typeof translations

/* ── Helper Components ── */

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function Section({ id, icon: Icon, title, collapsed, onToggle, children, darkMode, bookmarked, onToggleBookmark, lang }: {
  id: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; title: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode; darkMode: boolean
  bookmarked?: boolean; onToggleBookmark?: () => void; lang: Lang
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className={`rounded-xl border p-5 sm:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="flex-1 flex items-center gap-2 text-left group"
          >
            <Icon size={20} className="text-amber-600 shrink-0" />
            <h2 className="text-lg font-bold flex-1">{title}</h2>
            <div className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>
              <ChevronRight size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
            </div>
          </button>
          {onToggleBookmark && (
            <button
              onClick={onToggleBookmark}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                bookmarked
                  ? 'text-amber-500 hover:text-amber-600'
                  : darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'
              }`}
              title={bookmarked
                ? (lang === 'pt' ? 'Remover favorito' : 'Remove bookmark')
                : (lang === 'pt' ? 'Salvar esta seção nos favoritos' : 'Bookmark this section')
              }
            >
              {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="space-y-4 mt-4">
            {children}
          </div>
        )}
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-2 pl-1">
        {children}
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
      {children}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">{children}</kbd>
  )
}

function WalkthroughTip({ location, onNavigate, darkMode, lang }: {
  location: string; onNavigate: () => void; darkMode: boolean; lang: Lang
}) {
  return (
    <div className={`border-l-4 border-amber-500 rounded-r-lg px-4 py-3 flex items-center justify-between gap-3 ${
      darkMode ? 'bg-amber-900/10' : 'bg-amber-50/70'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <MapPin size={14} className="text-amber-600 shrink-0" />
        <div className="min-w-0">
          <p className={`text-[10px] uppercase font-semibold tracking-wide ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
            {lang === 'pt' ? 'Onde encontrar' : 'Where to find it'}
          </p>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{location}</p>
        </div>
      </div>
      <button
        onClick={onNavigate}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
      >
        {lang === 'pt' ? 'Ir para lá' : 'Go there'} <ExternalLink size={12} />
      </button>
    </div>
  )
}

function MediaSlot({ caption, type = 'screenshot', darkMode, lang }: {
  caption: string; type?: 'screenshot' | 'video'; darkMode: boolean; lang: Lang
}) {
  return (
    <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 ${
      darkMode ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50/50'
    }`}>
      {type === 'video' ? (
        <Play size={28} className={darkMode ? 'text-slate-500' : 'text-slate-300'} />
      ) : (
        <ImageIcon size={28} className={darkMode ? 'text-slate-500' : 'text-slate-300'} />
      )}
      <p className={`text-xs text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{caption}</p>
      <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${
        darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-400'
      }`}>{lang === 'pt' ? 'Em breve' : 'Coming soon'}</span>
    </div>
  )
}

/* ── Quick-Start Checklist ── */

function getChecklistItems(lang: Lang) {
  return [
    { id: 'login', title: translations.cl_login_title[lang], desc: translations.cl_login_desc[lang], section: 'overview' },
    { id: 'review-lead', title: translations.cl_review_title[lang], desc: translations.cl_review_desc[lang], section: 'pipeline' },
    { id: 'send-form', title: translations.cl_send_title[lang], desc: translations.cl_send_desc[lang], section: 'onboarding' },
    { id: 'setup-facility', title: translations.cl_facility_title[lang], desc: translations.cl_facility_desc[lang], section: 'facilities' },
    { id: 'create-lp', title: translations.cl_lp_title[lang], desc: translations.cl_lp_desc[lang], section: 'landing-pages' },
    { id: 'enter-data', title: translations.cl_data_title[lang], desc: translations.cl_data_desc[lang], section: 'facilities' },
  ]
}

function QuickStartChecklist({ darkMode, lang }: { darkMode: boolean; lang: Lang }) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('stowstack_admin_checklist')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [hidden, setHidden] = useState(() => localStorage.getItem('stowstack_admin_checklist_hidden') === 'true')

  const items = getChecklistItems(lang)

  useEffect(() => {
    localStorage.setItem('stowstack_admin_checklist', JSON.stringify([...checked]))
  }, [checked])

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const hide = () => {
    setHidden(true)
    localStorage.setItem('stowstack_admin_checklist_hidden', 'true')
  }

  const show = () => {
    setHidden(false)
    localStorage.removeItem('stowstack_admin_checklist_hidden')
  }

  if (hidden) {
    return (
      <button onClick={show} className={`text-xs flex items-center gap-1.5 mb-4 transition-colors ${
        darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
      }`}>
        <Rocket size={12} /> {translations.showChecklist[lang]} ({checked.size}/{items.length} {translations.done[lang]})
      </button>
    )
  }

  const progress = items.length > 0 ? (checked.size / items.length) * 100 : 0

  return (
    <div className={`rounded-xl border p-5 mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Rocket size={16} className="text-amber-600" /> {translations.quickStart[lang]}
        </h2>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{checked.size}/{items.length}</span>
          <button onClick={hide} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-1.5 rounded-full overflow-hidden mb-4 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map(item => {
          const done = checked.has(item.id)
          return (
            <div key={item.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              done
                ? darkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                : darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
            }`}>
              <button onClick={() => toggle(item.id)} className="mt-0.5 shrink-0">
                {done ? (
                  <CheckSquare size={18} className="text-amber-500" />
                ) : (
                  <Square size={18} className={darkMode ? 'text-slate-500' : 'text-slate-300'} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <a href={`#${item.section}`} className={`text-sm font-medium transition-colors ${
                  done
                    ? `line-through ${darkMode ? 'text-slate-500' : 'text-slate-400'}`
                    : darkMode ? 'text-slate-200 hover:text-amber-400' : 'text-slate-700 hover:text-amber-600'
                }`}>
                  {item.title}
                </a>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {checked.size === items.length && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-amber-600">{translations.allDone[lang]}</p>
        </div>
      )}
    </div>
  )
}

/* ── Section Data (for search) ── */

const SECTIONS_DATA = [
  { id: 'what-is', titleKey: 'sec_what_is' as TKey, keywords: 'what is stowstack business model self storage industry clients operators o que é negócio modelo indústria clientes operadores' },
  { id: 'overview', titleKey: 'sec_overview' as TKey, keywords: 'overview dashboard hub tabs login authentication admin key visão geral painel abas autenticação' },
  { id: 'pipeline', titleKey: 'sec_pipeline' as TKey, keywords: 'pipeline leads status workflow submitted form sent done audit ready call set signed lost bulk actions search filter follow-up overdue notes gestão fluxo enviado formulário auditoria busca filtro acompanhamento anotações' },
  { id: 'kanban', titleKey: 'sec_kanban' as TKey, keywords: 'kanban board drag drop columns visual status quadro arrastar soltar colunas' },
  { id: 'onboarding', titleKey: 'sec_onboarding' as TKey, keywords: 'onboarding client access code portal form wizard audit call close activate cliente código acesso assistente' },
  { id: 'facilities', titleKey: 'sec_facilities' as TKey, keywords: 'facilities facility campaign data spend leads move-ins revenue cpl roas unidades unidade campanha dados gasto mudanças receita' },
  { id: 'landing-pages', titleKey: 'sec_landing_pages' as TKey, keywords: 'landing pages slug hero trust bar features unit types gallery testimonials faq cta location map section builder publish variations a/b testing storedge página seções construtor publicar variações' },
  { id: 'portfolio', titleKey: 'sec_portfolio' as TKey, keywords: 'portfolio insights analytics cross-client aggregate performance reporting trends portfólio análises desempenho relatórios tendências' },
  { id: 'billing', titleKey: 'sec_billing' as TKey, keywords: 'billing invoices payment plan fees ad spend management faturamento faturas pagamento plano taxas gestão' },
  { id: 'settings', titleKey: 'sec_settings' as TKey, keywords: 'settings company name email phone signature notifications defaults follow-up dark mode configurações empresa nome telefone assinatura notificações padrões modo escuro' },
  { id: 'integrations', titleKey: 'sec_integrations' as TKey, keywords: 'meta facebook instagram google ads integration environment variables api connect publish integração variáveis ambiente conectar publicar' },
  { id: 'shortcuts', titleKey: 'sec_shortcuts' as TKey, keywords: 'keyboard shortcuts command palette cmd k escape tabs refresh notifications atalhos teclado paleta comandos' },
  { id: 'assets', titleKey: 'sec_assets' as TKey, keywords: 'assets creative images photos upload scraper stock library drag drop gallery hero recursos criativos imagens fotos upload extrator biblioteca arrastar soltar galeria' },
]

function getStatusFlow(lang: Lang) {
  return [
    { status: translations.status_submitted[lang], desc: translations.status_submitted_desc[lang] },
    { status: translations.status_form_sent[lang], desc: translations.status_form_sent_desc[lang] },
    { status: translations.status_form_done[lang], desc: translations.status_form_done_desc[lang] },
    { status: translations.status_audit_ready[lang], desc: translations.status_audit_ready_desc[lang] },
    { status: translations.status_call_set[lang], desc: translations.status_call_set_desc[lang] },
    { status: translations.status_signed[lang], desc: translations.status_signed_desc[lang] },
    { status: translations.status_lost[lang], desc: translations.status_lost_desc[lang] },
  ]
}

/* ── Changelog Data ── */

function getChangelog(lang: Lang) {
  return [
    { version: '1.3', date: lang === 'pt' ? '14 Mar 2026' : 'Mar 14, 2026', items: [
      { type: 'new' as const, text: translations.cl_13_1[lang] },
      { type: 'new' as const, text: translations.cl_13_2[lang] },
      { type: 'new' as const, text: translations.cl_13_3[lang] },
    ]},
    { version: '1.2', date: lang === 'pt' ? '10 Mar 2026' : 'Mar 10, 2026', items: [
      { type: 'new' as const, text: translations.cl_12_1[lang] },
      { type: 'new' as const, text: translations.cl_12_2[lang] },
      { type: 'improved' as const, text: translations.cl_12_3[lang] },
    ]},
    { version: '1.1', date: lang === 'pt' ? '6 Mar 2026' : 'Mar 6, 2026', items: [
      { type: 'new' as const, text: translations.cl_11_1[lang] },
      { type: 'new' as const, text: translations.cl_11_2[lang] },
      { type: 'new' as const, text: translations.cl_11_3[lang] },
      { type: 'improved' as const, text: translations.cl_11_4[lang] },
    ]},
    { version: '1.0', date: lang === 'pt' ? '28 Fev 2026' : 'Feb 28, 2026', items: [
      { type: 'new' as const, text: translations.cl_10_1[lang] },
      { type: 'new' as const, text: translations.cl_10_2[lang] },
      { type: 'new' as const, text: translations.cl_10_3[lang] },
      { type: 'new' as const, text: translations.cl_10_4[lang] },
    ]},
  ]
}

/* ── Bookmarks Panel ── */

function BookmarksPanel({ bookmarks, sections, darkMode, onJump, onRemove, onClose, lang }: {
  bookmarks: Set<string>
  sections: typeof SECTIONS_DATA
  darkMode: boolean
  onJump: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
  lang: Lang
}) {
  const t = (key: TKey) => translations[key][lang]
  const bookmarkedSections = sections.filter(s => bookmarks.has(s.id))

  return (
    <div className={`rounded-xl border p-5 mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Star size={16} className="text-amber-500" /> {t('myBookmarks')}
        </h2>
        <button onClick={onClose} className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
          <XIcon size={14} />
        </button>
      </div>
      {bookmarkedSections.length === 0 ? (
        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {t('noBookmarks')}
        </p>
      ) : (
        <div className="space-y-1">
          {bookmarkedSections.map(s => (
            <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
              <a
                href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); onJump(s.id) }}
                className="flex-1 text-sm text-amber-600 hover:text-amber-700"
              >
                {t(s.titleKey)}
              </a>
              <button
                onClick={() => onRemove(s.id)}
                className={`p-1 rounded transition-colors ${darkMode ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
                title={t('removeBookmark')}
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Language Toggle ── */

function LanguageToggle({ lang, onChange, darkMode }: { lang: Lang; onChange: (l: Lang) => void; darkMode: boolean }) {
  return (
    <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border text-xs font-medium ${
      darkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-slate-50'
    }`}>
      <button
        onClick={() => onChange('en')}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
          lang === 'en'
            ? 'bg-amber-600 text-white'
            : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Globe size={11} />
        ENG
      </button>
      <button
        onClick={() => onChange('pt')}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
          lang === 'pt'
            ? 'bg-amber-600 text-white'
            : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Globe size={11} />
        BR PT
      </button>
    </div>
  )
}

/* ── Main Component ── */

export default function AdminGuide({ onBack, darkMode, scrollToSection }: { onBack: (targetTab?: string) => void; darkMode: boolean; scrollToSection?: string | null }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('stowstack_admin_guide_lang')
      return (saved === 'pt' || saved === 'en') ? saved : 'en'
    } catch { return 'en' }
  })
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('stowstack_admin_bookmarks')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [showBookmarks, setShowBookmarks] = useState(false)

  const t = (key: TKey) => translations[key][lang]

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang)
    localStorage.setItem('stowstack_admin_guide_lang', newLang)
  }

  // Auto-scroll to a section when opened from a contextual help tooltip
  useEffect(() => {
    if (scrollToSection) {
      setCollapsedSections(prev => {
        const next = new Set(prev)
        next.delete(scrollToSection)
        return next
      })
      setTimeout(() => {
        const el = document.getElementById(scrollToSection)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, [scrollToSection])

  useEffect(() => {
    localStorage.setItem('stowstack_admin_bookmarks', JSON.stringify([...bookmarks]))
  }, [bookmarks])

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const expandAll = () => setCollapsedSections(new Set())
  const collapseAll = () => setCollapsedSections(new Set(SECTIONS_DATA.map(s => s.id)))

  const allCollapsed = collapsedSections.size === SECTIONS_DATA.length

  // Filter sections by search query
  const q = searchQuery.toLowerCase().trim()
  const visibleSections = q
    ? SECTIONS_DATA.filter(s => t(s.titleKey).toLowerCase().includes(q) || s.keywords.includes(q))
    : SECTIONS_DATA
  const visibleIds = new Set(visibleSections.map(s => s.id))

  // When searching, auto-expand matching sections
  const isCollapsed = (id: string) => {
    if (q && visibleIds.has(id)) return false
    return collapsedSections.has(id)
  }

  const tocItems = SECTIONS_DATA.map(s => ({ id: s.id, label: t(s.titleKey) }))

  const goToTab = (tab: string) => onBack(tab)

  const STATUS_FLOW = getStatusFlow(lang)
  const CHANGELOG = getChangelog(lang)

  const LP_SECTIONS = [
    { label: t('lp_hero'), desc: t('lp_hero_desc') },
    { label: t('lp_trust'), desc: t('lp_trust_desc') },
    { label: t('lp_features'), desc: t('lp_features_desc') },
    { label: t('lp_units'), desc: t('lp_units_desc') },
    { label: t('lp_gallery'), desc: t('lp_gallery_desc') },
    { label: t('lp_testimonials'), desc: t('lp_testimonials_desc') },
    { label: t('lp_faq'), desc: t('lp_faq_desc') },
    { label: t('lp_cta'), desc: t('lp_cta_desc') },
    { label: t('lp_location'), desc: t('lp_location_desc') },
  ]

  const ENV_VARS = [
    { key: 'META_APP_ID', desc: t('integrations_env_meta_app') },
    { key: 'META_APP_SECRET', desc: t('integrations_env_meta_secret') },
    { key: 'META_ACCESS_TOKEN', desc: t('integrations_env_meta_token') },
    { key: 'GOOGLE_ADS_CLIENT_ID', desc: t('integrations_env_google_id') },
    { key: 'GOOGLE_ADS_CLIENT_SECRET', desc: t('integrations_env_google_secret') },
  ]

  const SHORTCUTS = [
    ['⌘K', t('sc_cmd_k')],
    ['1', t('sc_1')],
    ['2', t('sc_2')],
    ['3', t('sc_3')],
    ['4', t('sc_4')],
    ['5', t('sc_5')],
    ['6', t('sc_6')],
    ['H', t('sc_h')],
    ['?', t('sc_question')],
    ['N', t('sc_n')],
    ['R', t('sc_r')],
    ['Escape', t('sc_escape')],
  ]

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`border-b sticky top-0 z-30 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => onBack()} className={`p-2 -ml-2 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <ArrowLeft size={20} />
          </button>
          <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight font-['Space_Grotesk']">
            Stow<span className="text-amber-600">Stack</span>
          </span>
          <span className={`text-xs ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('adminGuide')}</span>

          {/* Search + Controls */}
          <div className="flex-1 flex justify-end items-center gap-2">
            <LanguageToggle lang={lang} onChange={handleLangChange} darkMode={darkMode} />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
            }`}>
              <Search size={14} className={darkMode ? 'text-slate-400' : 'text-slate-400'} />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent focus:outline-none text-sm w-32 sm:w-48 ${
                  darkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                  <XIcon size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className={`p-2 rounded-lg transition-colors relative ${
                darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={t('bookmarks')}
            >
              <Star size={16} className={bookmarks.size > 0 ? 'text-amber-500' : ''} />
              {bookmarks.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {bookmarks.size}
                </span>
              )}
            </button>
            <button
              onClick={handlePrint}
              className={`p-2 rounded-lg transition-colors print:hidden ${
                darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={t('printGuide')}
            >
              <Printer size={16} />
            </button>
            <button
              onClick={allCollapsed ? expandAll : collapseAll}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                darkMode ? 'border-slate-600 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {allCollapsed ? <Eye size={12} /> : <ChevronDown size={12} />}
              {allCollapsed ? t('expand') : t('collapse')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{t('pageTitle')}</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('pageSubtitle')}
          </p>
        </div>

        {/* Quick-Start Checklist */}
        <QuickStartChecklist darkMode={darkMode} lang={lang} />

        {/* Bookmarks Panel */}
        {showBookmarks && (
          <BookmarksPanel
            bookmarks={bookmarks}
            sections={SECTIONS_DATA}
            darkMode={darkMode}
            lang={lang}
            onJump={(id) => {
              setShowBookmarks(false)
              const el = document.getElementById(id)
              if (el) el.scrollIntoView({ behavior: 'smooth' })
              setCollapsedSections(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
            }}
            onRemove={(id) => toggleBookmark(id)}
            onClose={() => setShowBookmarks(false)}
          />
        )}

        {/* Table of Contents */}
        {!q && (
          <nav className={`rounded-xl border p-5 mb-8 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <BookOpen size={14} /> {t('contents')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-1">
              {tocItems.map(item => (
                <a key={item.id} href={`#${item.id}`}
                  className="text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg px-3 py-1.5 transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        )}

        {/* Search results indicator */}
        {q && (
          <div className={`flex items-center gap-2 mb-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Search size={14} />
            {visibleSections.length} {visibleSections.length === 1 ? t('sectionMatching') : t('sectionsMatching')} {t('matching')} "{searchQuery}"
            <button onClick={() => setSearchQuery('')} className="text-amber-600 hover:text-amber-700 ml-1">{t('clear')}</button>
          </div>
        )}

        <div className="space-y-6">

          {/* What is StowStack */}
          {visibleIds.has('what-is') && (
            <Section id="what-is" icon={Rocket} title={t('sec_what_is')} collapsed={isCollapsed('what-is')} onToggle={() => toggleSection('what-is')} darkMode={darkMode} bookmarked={bookmarks.has('what-is')} onToggleBookmark={() => toggleBookmark('what-is')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('what_is_p1')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('what_is_p2')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('what_is_p3')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('what_is_p4')}
              </p>
              <InfoBox>
                {t('what_is_industry')}
              </InfoBox>
            </Section>
          )}

          {/* Overview */}
          {visibleIds.has('overview') && (
            <Section id="overview" icon={Building2} title={t('sec_overview')} collapsed={isCollapsed('overview')} onToggle={() => toggleSection('overview')} darkMode={darkMode} bookmarked={bookmarks.has('overview')} onToggleBookmark={() => toggleBookmark('overview')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('overview_p1')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('overview_p2')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('overview_p3')}
              </p>

              <SubSection title={t('overview_tabs_title')}>
                <div className="space-y-2">
                  {[
                    t('overview_tab_pipeline'),
                    t('overview_tab_kanban'),
                    t('overview_tab_portfolio'),
                    t('overview_tab_insights'),
                    t('overview_tab_billing'),
                    t('overview_tab_settings'),
                    t('overview_tab_facilities'),
                  ].map((desc, i) => (
                    <div key={i} className={`rounded-lg px-4 py-3 border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </SubSection>

              <MediaSlot caption={t('overview_media')} darkMode={darkMode} lang={lang} />
              <InfoBox>
                {t('overview_info')} <Kbd>/admin</Kbd>{t('overview_info2')}
              </InfoBox>
            </Section>
          )}

          {/* Pipeline Management */}
          {visibleIds.has('pipeline') && (
            <Section id="pipeline" icon={Users} title={t('sec_pipeline')} collapsed={isCollapsed('pipeline')} onToggle={() => toggleSection('pipeline')} darkMode={darkMode} bookmarked={bookmarks.has('pipeline')} onToggleBookmark={() => toggleBookmark('pipeline')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('pipeline_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('pipeline_intro2')}
              </p>

              <WalkthroughTip location={t('pipeline_walkthrough')} onNavigate={() => goToTab('pipeline')} darkMode={darkMode} lang={lang} />

              <SubSection title={t('pipeline_status_title')}>
                <div className="space-y-2 mt-1">
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s.status} className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <div>
                        <p className="text-sm font-semibold">{s.status}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SubSection>

              <SubSection title={t('pipeline_working_title')}>
                <Step n={1}>{t('pipeline_step1')}</Step>
                <Step n={2}>{t('pipeline_step2')}</Step>
                <Step n={3}>{t('pipeline_step3')}</Step>
                <Step n={4}>{t('pipeline_step4')}</Step>
              </SubSection>

              <SubSection title={t('pipeline_bulk_title')}>
                <Step n={1}>{t('pipeline_bulk1')}</Step>
                <Step n={2}>{t('pipeline_bulk2')}</Step>
              </SubSection>

              <SubSection title={t('pipeline_search_title')}>
                <p className="text-sm leading-relaxed">
                  {t('pipeline_search_desc')}
                </p>
              </SubSection>

              <MediaSlot caption={t('pipeline_media')} darkMode={darkMode} lang={lang} />

              <InfoBox>
                {t('pipeline_info')} <Kbd>⌘K</Kbd> {t('pipeline_info2')}
              </InfoBox>
            </Section>
          )}

          {/* Kanban Board */}
          {visibleIds.has('kanban') && (
            <Section id="kanban" icon={Columns3} title={t('sec_kanban')} collapsed={isCollapsed('kanban')} onToggle={() => toggleSection('kanban')} darkMode={darkMode} bookmarked={bookmarks.has('kanban')} onToggleBookmark={() => toggleBookmark('kanban')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('kanban_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('kanban_intro2')}
              </p>

              <WalkthroughTip location={t('kanban_walkthrough')} onNavigate={() => goToTab('kanban')} darkMode={darkMode} lang={lang} />

              <Step n={1}>{t('kanban_step1')}</Step>
              <Step n={2}>{t('kanban_step2')}</Step>
              <Step n={3}>{t('kanban_step3')}</Step>

              <MediaSlot caption={t('kanban_media')} darkMode={darkMode} lang={lang} />

              <InfoBox>
                {t('kanban_info')}
              </InfoBox>
            </Section>
          )}

          {/* Client Onboarding */}
          {visibleIds.has('onboarding') && (
            <Section id="onboarding" icon={ClipboardList} title={t('sec_onboarding')} collapsed={isCollapsed('onboarding')} onToggle={() => toggleSection('onboarding')} darkMode={darkMode} bookmarked={bookmarks.has('onboarding')} onToggleBookmark={() => toggleBookmark('onboarding')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('onboarding_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('onboarding_intro2')}
              </p>

              <SubSection title={t('onboarding_title')}>
                <Step n={1}><strong>{t('onboarding_s1_bold')}</strong>{t('onboarding_s1')}</Step>
                <Step n={2}><strong>{t('onboarding_s2_bold')}</strong>{t('onboarding_s2')}</Step>
                <Step n={3}><strong>{t('onboarding_s3_bold')}</strong>{t('onboarding_s3')}<Kbd>stowstack.co/portal</Kbd>{t('onboarding_s3b')}</Step>
                <Step n={4}><strong>{t('onboarding_s4_bold')}</strong>{t('onboarding_s4')}</Step>
                <Step n={5}><strong>{t('onboarding_s5_bold')}</strong>{t('onboarding_s5')}</Step>
                <Step n={6}><strong>{t('onboarding_s6_bold')}</strong>{t('onboarding_s6')}</Step>
                <Step n={7}><strong>{t('onboarding_s7_bold')}</strong>{t('onboarding_s7')}</Step>
              </SubSection>

              <InfoBox>
                {t('onboarding_info')}
              </InfoBox>
            </Section>
          )}

          {/* Facilities Management */}
          {visibleIds.has('facilities') && (
            <Section id="facilities" icon={Building2} title={t('sec_facilities')} collapsed={isCollapsed('facilities')} onToggle={() => toggleSection('facilities')} darkMode={darkMode} bookmarked={bookmarks.has('facilities')} onToggleBookmark={() => toggleBookmark('facilities')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('facilities_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('facilities_intro2')}
              </p>

              <WalkthroughTip location={t('facilities_walkthrough')} onNavigate={() => goToTab('facilities')} darkMode={darkMode} lang={lang} />

              <SubSection title={t('facilities_setup_title')}>
                <Step n={1}>{t('facilities_setup1')}</Step>
                <Step n={2}>{t('facilities_setup2')}</Step>
                <Step n={3}>{t('facilities_setup3')}</Step>
              </SubSection>

              <SubSection title={t('facilities_data_title')}>
                <Step n={1}>{t('facilities_data1')}</Step>
                <Step n={2}>{t('facilities_data2')}</Step>
                <Step n={3}>{t('facilities_data3')}</Step>
                <Step n={4}>{t('facilities_data4')}</Step>
              </SubSection>

              <MediaSlot caption={t('facilities_media')} darkMode={darkMode} lang={lang} />

              <SubSection title={t('facilities_lp_title')}>
                <p className="text-sm leading-relaxed">
                  {t('facilities_lp_desc')}
                </p>
              </SubSection>
            </Section>
          )}

          {/* Landing Pages */}
          {visibleIds.has('landing-pages') && (
            <Section id="landing-pages" icon={Layers} title={t('sec_landing_pages')} collapsed={isCollapsed('landing-pages')} onToggle={() => toggleSection('landing-pages')} darkMode={darkMode} bookmarked={bookmarks.has('landing-pages')} onToggleBookmark={() => toggleBookmark('landing-pages')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('lp_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('lp_intro2')}
              </p>

              <WalkthroughTip location={t('lp_walkthrough')} onNavigate={() => goToTab('facilities')} darkMode={darkMode} lang={lang} />

              <SubSection title={t('lp_create_title')}>
                <Step n={1}>{t('lp_create1')}</Step>
                <Step n={2}>{t('lp_create2')} <Kbd>/lp/your-slug</Kbd>).</Step>
                <Step n={3}>{t('lp_create3')}</Step>
                <Step n={4}>{t('lp_create4')}</Step>
                <Step n={5}>{t('lp_create5')}</Step>
              </SubSection>

              <SubSection title={t('lp_sections_title')}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {LP_SECTIONS.map(s => (
                    <div key={s.label} className={`rounded-lg p-3 border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </SubSection>

              <MediaSlot caption={t('lp_media')} darkMode={darkMode} lang={lang} />

              <SubSection title={t('lp_publish_title')}>
                <p className="text-sm leading-relaxed">
                  {t('lp_publish_desc')}
                </p>
              </SubSection>

              <InfoBox>
                {t('lp_info')}
              </InfoBox>
            </Section>
          )}

          {/* Portfolio & Insights */}
          {visibleIds.has('portfolio') && (
            <Section id="portfolio" icon={BarChart3} title={t('sec_portfolio')} collapsed={isCollapsed('portfolio')} onToggle={() => toggleSection('portfolio')} darkMode={darkMode} bookmarked={bookmarks.has('portfolio')} onToggleBookmark={() => toggleBookmark('portfolio')} lang={lang}>
              <SubSection title={t('portfolio_view_title')}>
                <p className="text-sm leading-relaxed">
                  {t('portfolio_view_desc')}
                </p>
              </SubSection>

              <SubSection title={t('portfolio_metrics_title')}>
                <p className="text-sm leading-relaxed">
                  {t('portfolio_metrics_desc')}
                </p>
              </SubSection>

              <SubSection title={t('insights_view_title')}>
                <p className="text-sm leading-relaxed">
                  {t('insights_view_desc')}
                </p>
              </SubSection>

              <InfoBox>
                {t('portfolio_info')}
              </InfoBox>
            </Section>
          )}

          {/* Billing */}
          {visibleIds.has('billing') && (
            <Section id="billing" icon={CreditCard} title={t('sec_billing')} collapsed={isCollapsed('billing')} onToggle={() => toggleSection('billing')} darkMode={darkMode} bookmarked={bookmarks.has('billing')} onToggleBookmark={() => toggleBookmark('billing')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('billing_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('billing_intro2')}
              </p>

              <WalkthroughTip location={t('billing_walkthrough')} onNavigate={() => goToTab('billing')} darkMode={darkMode} lang={lang} />

              <Step n={1}>{t('billing_step1')}</Step>
              <Step n={2}>{t('billing_step2')}</Step>
              <Step n={3}>{t('billing_step3')}</Step>
            </Section>
          )}

          {/* Settings */}
          {visibleIds.has('settings') && (
            <Section id="settings" icon={Settings} title={t('sec_settings')} collapsed={isCollapsed('settings')} onToggle={() => toggleSection('settings')} darkMode={darkMode} bookmarked={bookmarks.has('settings')} onToggleBookmark={() => toggleBookmark('settings')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('settings_intro')}
              </p>

              <WalkthroughTip location={t('settings_walkthrough')} onNavigate={() => goToTab('settings')} darkMode={darkMode} lang={lang} />

              <SubSection title={t('settings_company_title')}>
                <p className="text-sm leading-relaxed">
                  {t('settings_company_desc')}
                </p>
              </SubSection>

              <SubSection title={t('settings_notif_title')}>
                <p className="text-sm leading-relaxed">
                  {t('settings_notif_desc')}
                </p>
              </SubSection>

              <SubSection title={t('settings_defaults_title')}>
                <Step n={1}><strong>{t('settings_defaults1_bold')}</strong>{t('settings_defaults1')}</Step>
                <Step n={2}><strong>{t('settings_defaults2_bold')}</strong>{t('settings_defaults2')} <Kbd>⌘K</Kbd> {t('settings_defaults2b')}</Step>
              </SubSection>
            </Section>
          )}

          {/* Meta & Google Integration */}
          {visibleIds.has('integrations') && (
            <Section id="integrations" icon={Megaphone} title={t('sec_integrations')} collapsed={isCollapsed('integrations')} onToggle={() => toggleSection('integrations')} darkMode={darkMode} bookmarked={bookmarks.has('integrations')} onToggleBookmark={() => toggleBookmark('integrations')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('integrations_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('integrations_intro2')}
              </p>

              <SubSection title={t('integrations_env_title')}>
                <p className="text-sm leading-relaxed">
                  {t('integrations_env_desc')}
                </p>
                <div className="space-y-1 mt-2">
                  {ENV_VARS.map(v => (
                    <div key={v.key} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <Kbd>{v.key}</Kbd>
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{v.desc}</span>
                    </div>
                  ))}
                </div>
              </SubSection>

              <SubSection title={t('integrations_connect_title')}>
                <Step n={1}>{t('integrations_connect1')}</Step>
                <Step n={2}>{t('integrations_connect2')}</Step>
                <Step n={3}>{t('integrations_connect3')}</Step>
              </SubSection>

              <MediaSlot caption={t('integrations_media')} type="video" darkMode={darkMode} lang={lang} />

              <InfoBox>
                {t('integrations_info')}
              </InfoBox>
            </Section>
          )}

          {/* Keyboard Shortcuts */}
          {visibleIds.has('shortcuts') && (
            <Section id="shortcuts" icon={Keyboard} title={t('sec_shortcuts')} collapsed={isCollapsed('shortcuts')} onToggle={() => toggleSection('shortcuts')} darkMode={darkMode} bookmarked={bookmarks.has('shortcuts')} onToggleBookmark={() => toggleBookmark('shortcuts')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('shortcuts_intro')}
              </p>
              <div className="mt-2">
                <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                        <th className="text-left px-4 py-2 text-xs font-semibold">{t('shortcut')}</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold">{t('action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SHORTCUTS.map(([key, desc]) => (
                        <tr key={key} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                          <td className="px-4 py-2"><Kbd>{key}</Kbd></td>
                          <td className={`px-4 py-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          )}

          {/* Assets & Creative */}
          {visibleIds.has('assets') && (
            <Section id="assets" icon={Image} title={t('sec_assets')} collapsed={isCollapsed('assets')} onToggle={() => toggleSection('assets')} darkMode={darkMode} bookmarked={bookmarks.has('assets')} onToggleBookmark={() => toggleBookmark('assets')} lang={lang}>
              <p className="text-sm leading-relaxed">
                {t('assets_intro')}
              </p>
              <p className="text-sm leading-relaxed">
                {t('assets_intro2')}
              </p>

              <SubSection title={t('assets_sources_title')}>
                <Step n={1}><strong>{t('assets_upload_bold')}</strong>{t('assets_upload')}</Step>
                <Step n={2}><strong>{t('assets_scraper_bold')}</strong>{t('assets_scraper')}</Step>
                <Step n={3}><strong>{t('assets_stock_bold')}</strong>{t('assets_stock')}</Step>
              </SubSection>

              <SubSection title={t('assets_using_title')}>
                <p className="text-sm leading-relaxed">
                  {t('assets_using_desc')}
                </p>
              </SubSection>

              <InfoBox>
                {t('assets_info')}
              </InfoBox>
            </Section>
          )}

          {/* What's New / Changelog */}
          {!q && (
            <section id="changelog" className="scroll-mt-20">
              <div className={`rounded-xl border p-5 sm:p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Sparkles size={20} className="text-amber-600" /> {t('whatsNew')}
                </h2>
                <div className="space-y-5">
                  {CHANGELOG.map(release => (
                    <div key={release.version}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold">v{release.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                          {release.date}
                        </span>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {release.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                              item.type === 'new'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {item.type === 'new' ? t('new') : t('improved')}
                            </span>
                            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* No results */}
          {q && visibleSections.length === 0 && (
            <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('noResults')} "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')} className="text-amber-600 hover:text-amber-700 text-sm mt-2">{t('clearSearch')}</button>
            </div>
          )}

        </div>

        <div className="mt-12 mb-8 text-center">
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('footer')}
          </p>
        </div>
      </div>
    </div>
  )
}
