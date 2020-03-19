'use strict';

const express = require('express');
const models = require('../../models/model-datastore');
const { validationResult } = require('express-validator');
const validation = require('../../validation');
const config = require('../../config');
const services = require('../../services/enquetes');
const oauth = require('../../lib/oauth');
const router = express.Router();
const bodyParser = require('body-parser');
const csurf = require('csurf');

// setup route middlewares
const csrfProtection = csurf({ cookie: true });
const parseForm = bodyParser.urlencoded({ extended: false });

router.use(oauth.checkIsLogin);

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});



/**
 * GET /mypage
 *
 * 作成したアンケートとお気に入りアンケートの一覧を表示
 */
router.get('/', csrfProtection, async (req, res, next) => {
  try{
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [enquetes, enquetesToken] = await models.questions.myQuestions(Number(req.user.id), perPage, req.query.enquetesToken);
    const [favorites, favoritesToken] = await models.questions.myFavorites(Number(req.user.id), perPage, req.query.favoritesToken);

    const enquetesWithConditions = [];
    const favoritesWithConditions = [];

    for(const question of enquetes){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      enquetesWithConditions.push(q);
    }
    for(const question of favorites){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      favoritesWithConditions.push(q);
    }

    return res.render('mypage/top.pug', {
      url: `${req.baseUrl}${req.url}`,
      enquetes: enquetesWithConditions,
      favorites: favoritesWithConditions,
      enquetesToken: enquetesToken,
      favoritesToken: favoritesToken,
      csrfToken: req.csrfToken(),
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e) {
    console.log(e);
    req.flash('error', 'アンケートの取得に失敗しました。');
    return next('route');
  }
});


/**
 * POST /mypage/:question_id
 *
 * 押されたボタンで分岐
 * 修正ボタンの場合は修正画面に
 * 削除ボタンの場合は削除確認画面に移動
 * それ以外の場合は次のエラー処理
 */
router.post('/:question_id', async(req, res, next) => {
  try {
    if(req.body.modify != null) return res.redirect(`${req.baseUrl}/${req.params.question_id}`);
    else if (req.body.delete != null) return res.redirect(`${req.baseUrl}/${req.params.question_id}/delete`);
  } catch (e) {
    console.log(e);
    next(e);
  }
});


/**
 * GET /mypage/:question_id
 *
 * 作成したアンケートの編集画面を表示
 */
router.get('/:question_id', csrfProtection, async (req, res, next) => {
  try {
    const question = await models.questions.findById(parseInt(req.params.question_id));
    if(question.user_id != req.user.id){
      console.log("ERROR: question's user_id does not match to req.user.id");
      req.flash('error', 'アンケートの取得に失敗しました。');
      return res.redirect(`${req.baseUrl}`);
    }

    const questionWithConditions = await services.setConditions(question, req.cookies[req.params.question_id], req.user);
    questionWithConditions.answers = question.answers.map(answer => answer.content);

    res.render('mypage/edit.pug', {
      url: `${req.baseUrl}${req.url}`,
      action: 'アンケートの修正',
      question: questionWithConditions,
      csrfToken: req.csrfToken(),
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e) {
    console.log(e);
    req.flash('error', 'アンケートの取得に失敗しました。');
    next(e);
  }
});



/**
 * POST /mypage/:question_id/edit
 *
 * アンケートを更新
 */
router.post('/:question_id/edit', validation.checkQuestionModification, parseForm, csrfProtection,
  async (req, res, next) => {
    try {
      // validationエラーを処理
      const errors = await validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors);
        req.flash('error', 'アンケートを修正できませんでした。時間を空けて再度お試しください。');
        return res.redirect(`${req.baseUrl}/${req.params.question_id}`);
      }

      const question = await models.questions.findById(Number(req.params.question_id));
      if(question.user_id != req.user.id){
        console.log("ERROR: question's user_id does not match to req.user.id");
        req.flash('error', 'アンケートを修正できませんでした。時間を空けて再度お試しください。');
        return res.redirect(`${req.baseUrl}`);
      }

      // formの値をquestionに格納
      question.title = req.body.title;
      question.description = req.body.description;
      question.answer_type = req.body.answer_type;
      question.period_hours = parseInt(req.body.period_hours, 10);
      question.publish_status = parseInt(req.body.publish_status);
      const voteCount = await models.questions.getVoteCount(question.id);
      question.count -= voteCount;
      delete question.id;
      delete question.answers;

      const savedData = await models.questions.update(Number(req.params.question_id), question);

      services.images.createTwitterCard(savedData.id);
      req.flash('info', 'アンケートが修正されました。');
      return res.redirect(`${req.baseUrl}`);
    } catch (e) {
      console.log(e);
      req.flash('error', 'アンケートを修正できませんでした。時間を空けて再度お試しください。');
      return res.redirect(`${req.baseUrl}/${req.params.question_id}`);
    }
  }
);




/**
 * GET /mypage/:question_id/delete
 *
 * 作成したアンケートの削除確認画面を表示
 */
router.get('/:question_id/delete', async (req, res, next) => {
  try {
    const question = await models.questions.findById(parseInt(req.params.question_id));
    if(question.user_id != req.user.id){
      console.log("ERROR: question's user_id does not match to req.user.id");
      req.flash('error', 'アンケートの取得に失敗しました。');
      return res.redirect(`${req.baseUrl}`);
    }
    const questionWithConditions = await services.setConditions(question, req.cookies[req.params.question_id], req.user);
    questionWithConditions.answers = question.answers.map(answer => answer.content);

    res.render('mypage/delete.pug', {
      url: `${req.baseUrl}${req.url}`,
      action: 'アンケートの削除',
      question: questionWithConditions,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e) {
    console.log(e);
    req.flash('error', 'アンケートの取得に失敗しました。');
    next(e);
  }
});



/**
 * POST /mypage/:question_id/delete
 *
 * 作成したアンケートを削除
 */
router.post('/:question_id/delete', async(req, res, next) => {
  try {
    if (req.body.destroy != null) {
      const question = await models.questions.findById(Number(req.params.question_id));
      if(question.user_id != req.user.id){
        console.log("ERROR: question's user_id does not match to req.user.id");
        req.flash('error', 'アンケートの取得に失敗しました。');
        return res.redirect(`${req.baseUrl}/${req.params.question_id}/delete`);
      }
      await models.questions.deleteByQuestionId(Number(req.params.question_id));
      req.flash('info', 'アンケートを削除しました。');
    }

    return res.redirect('/mypage');
  } catch (e) {
    console.log(e);
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
