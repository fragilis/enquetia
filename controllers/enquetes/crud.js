'use strict';

const express = require('express');
const models = require('../../models/model-datastore');
const { validationResult } = require('express-validator');
const validation = require('../../validation');
const config = require('../../config');
const services = require('../../services/enquetes');
//const oauth = require('../../lib/oauth');
const router = express.Router();
const bodyParser = require('body-parser');
const csurf = require('csurf');

// setup route middlewares
const csrfProtection = csurf({ cookie: true });
const parseForm = bodyParser.urlencoded({ extended: false });

//router.use(oauth.template);

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});



/**
 * GET /
 *
 * 人気のアンケートと最新アンケートを一覧表示
 */
router.get('/', csrfProtection, async (req, res, next) => {
  try{
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [topics, topicsToken] = await models.questions.popular(perPage);
    const [news, newsToken] = await models.questions.latest(perPage);

    const topicsWithConditions = [];
    const newsWithConditions = [];

    for(const question of topics){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      topicsWithConditions.push(q);
    }
    for(const question of news){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      newsWithConditions.push(q);
    }

    if(req.cookies.hasVisited == null){
      req.flash('info', 'Enquetia（アンケティア）へようこそ！アンケティアは誰でも匿名でアンケートの作成・回答ができるサービスです。まずは気になるアンケートに投票してみましょう！');
    }
    res.cookie('hasVisited', '1', {maxAge: 1000*60*60*24*7, httpOnly: true, sameSite: 'Lax'});

    return res.render('enquetes/list.pug', {
      url: req.url,
      topics: topicsWithConditions,
      news: newsWithConditions,
      topicsToken: topicsToken,
      newsToken: newsToken,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
      csrfToken: req.csrfToken(),
    });
  } catch (e) {
    console.log(e);
    req.flash('error', 'アンケートの取得に失敗しました。');
    return next('route');
  }
});


/**
 * GET /enquetes/add
 *
 * アンケート作成フォームを表示
 */
router.get('/add', (req, res) => {
  const passedVariable = req.cookies.question || {};
  res.clearCookie('question');

  res.render('enquetes/form.pug', {
    url: req.url,
    question: passedVariable,
    maxItemCount: config.get('MAX_ITEM_COUNT'),
    action: 'アンケートの作成',
  });
});


/**
 * POST /add
 *
 * バリデーションチェックをして確認画面にリダイレクト
 */
router.post('/add', validation.checkQuestion,
  (req, res, next) => {
    res.clearCookie('question');

    // validationエラーを処理
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors);
      req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
      res.cookie('question', req.body, {httpOnly: true, sameSite: 'Lax'});
      return res.redirect(`${req.baseUrl}/add`);
    }

    // 確認画面にリダイレクト
    res.cookie('question', req.body, {httpOnly: true, sameSite: 'Lax'});
    return res.redirect(`${req.baseUrl}/confirm`);
  }
);


/**
 * GET /confirm
 *
 * 入力内容確認画面を表示
 */
router.get('/confirm', csrfProtection, (req, res, next) => {
  const passedVariable = req.cookies.question;
  if(passedVariable == null || !Object.keys(passedVariable).length){
    req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
    res.cookie('question', req.body, {httpOnly: true, sameSite: 'Lax'});
    return res.redirect(`${req.baseUrl}/add`);
  }

  if(!req.user) req.flash('warn', '現在ログインしていません。この状態で作成したアンケートは後で編集・削除できません。');

  res.render('enquetes/confirm.pug', {
    url: req.url,
    question: passedVariable,
    action: '確認画面',
    csrfToken: req.csrfToken(),
    maxItemCount: config.get('MAX_ITEM_COUNT'),
  });
});


/**
 * POST /confirm
 *
 * 確認画面で押されたボタンで分岐
 * 修正ボタンの場合は入力画面に戻る
 * 作成ボタンの場合は次のルーティングに移動
 * それ以外の場合は次のエラー処理
 */
router.post('/confirm', validation.checkQuestion, parseForm, csrfProtection,
  (req, res, next) => {
    if(req.body.modify != null) return res.redirect(`${req.baseUrl}/add`);
    else if (req.body.create != null) return next('route');
    else{
      const err = {
        code: 400,
        message: 'Bad request',
      };
      return next(err);
    }
  }
);


/**
 * POST /confirm
 *
 * バリデーションチェック（2回目）をして今度こそ登録
 */
router.post('/confirm', validation.checkQuestion, parseForm, csrfProtection,
  async (req, res, next) => {
    try {
      res.clearCookie('question');

      // validationエラーを処理
      const errors = await validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors);
        req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
        res.cookie('question', req.body, {httpOnly: true, sameSite: 'Lax'});
        return res.redirect(`${req.baseUrl}/add`);
      }

      // formの値をquestionとanswersに格納
      const [question, answers] = await services.setEnqueteValues(req.body, req.user);

      const savedData = await models.questions.create(question, answers);

      await services.images.createTwitterCard(savedData.id);
      req.flash('info', 'アンケートが作成されました。アンケート右上のツイッターアイコンから、作成したアンケートについてツイートできます。');
      return res.redirect(`${req.baseUrl}/${savedData.id}`);
    } catch (e) {
      console.log(e);
      req.flash('error', 'アンケートが作成できませんでした。時間を空けて再度お試しください。');
      res.cookie('question', req.body, {httpOnly: true, sameSite: 'Lax'});
      return res.redirect(`${req.baseUrl}/confirm`);
    }
  }
);


/**
 * GET /:question_id
 *
 * アンケート投票画面を表示
 */
router.get('/:question_id', csrfProtection, async (req, res, next) => {
  try {
    const question = await models.questions.findById(parseInt(req.params.question_id));
    const questionWithConditions = await services.setConditions(question, req.cookies[req.params.question_id], req.user);

    res.render('enquetes/view.pug', {
      url: req.url,
      action: 'アンケート投票',
      question: questionWithConditions,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
      csrfToken: req.csrfToken(),
    });
  } catch (e) {
    console.log(e);
    req.flash('error', 'アンケートの取得に失敗しました。');
    next(e);
  }
});


/**
 * POST /:question_id
 *
 * アンケートに投票
 */
/*
router.post('/:question_id', async (req, res, next) => {
  try {
    const vote = await services.setVoteValues(req.body);

    // 投票結果をDBに保存
    const savedData = await models.questions.vote(vote);
    res.cookie(req.body.question_id, '1', {maxAge: 1000*60*60*24*7, httpOnly: true, sameSite: 'Lax'});
    req.flash('info', '投票に成功しました。アンケート右上のツイッターアイコンから、投票結果をツイートできます。');

    return res.redirect(`${req.url}/result`);
  } catch (e) {
    console.log(e);
    req.flash('error', '投票に失敗しました。時間を空けて再度お試しください。');

    return res.redirect(`${req.baseUrl}/${req.url}`);
  }
});
*/


/**
 * GET /:question_id/result
 *
 * 投票結果を表示
 */
router.get('/:question_id/result', csrfProtection, async (req, res, next) => {
  try {
    const question = await models.questions.findById(req.params.question_id);
    const  questionWithConditions = await services.setConditions(question, req.cookies[String(question.id)], req.user);
    res.render('enquetes/result.pug', {
      url: req.url,
      action: 'アンケート結果',
      question: questionWithConditions,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
      csrfToken: req.csrfToken(),
    });
  } catch (e) {
    console.log(e)
    req.flash('error', '結果の取得に失敗しました。');
    next(e);
  }
});


/**
 * Errors on "/questions/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;
