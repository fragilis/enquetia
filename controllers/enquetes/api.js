'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const models = require('../../models/model-datastore');
const config = require('../../config');
const services = require('../../services/enquetes');
const csurf = require('csurf');

const csrfProtection = csurf({ cookie: true });
const parseForm = bodyParser.urlencoded({ extended: false });

const router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

/**
 * POST /api/addToFavorite
 *
 * アンケートをお気に入りに追加
 */
router.post('/addToFavorite', async (req, res, next) => {
  try {
    if(req.user == null) throw new Error('User is not logged in.');
    if(req.body.question_id == null) throw new Error('Bad request.');

    const favoriteEntity = await models.favorites.find(req.user.id, req.body.question_id);
    if(favoriteEntity.length){
      return res.json({
        favorite: favoriteEntity,
      });
    }

    const favorite = {
      user_id: parseInt(req.user.id),
      question_id: parseInt(req.body.question_id),
    };
    const entity = await models.favorites.create(favorite);
    return res.json({
      favorite: entity,
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/removeFromFavorite
 *
 * アンケートをお気に入りから削除
 */
router.post('/removeFromFavorite', async (req, res, next) => {
  try {
    if(req.user == null) throw new Error('User is not logged in.');
    if(req.body.question_id == null) throw new Error('Bad request.');
    const entities = await models.favorites.find(parseInt(req.user.id), parseInt(req.body.question_id));
    await models.favorites._delete(entities.map(entity => entity.id));
    return res.json({
      entity: entities,
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextTopics
 *
 * 話題のアンケートの続きを取得
 */
router.post('/getNextTopics', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [topics, topicsToken] = await models.questions.popular(perPage, req.body.token);

    const topicsWithConditions = [];
    for(const question of topics){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      topicsWithConditions.push(q);
    }

    return res.render('enquetes/list.pug', {
      url: '',
      topics: topicsWithConditions,
      news: null,
      topicsToken: topicsToken,
      newsToken: null,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextNews
 *
 * 最新アンケートの続きを取得
 */
router.post('/getNextNews', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [news, newsToken] = await models.questions.latest(perPage, req.body.token);

    const newsWithConditions = [];
    for(const question of news){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      newsWithConditions.push(q);
    }

    return res.render('enquetes/list.pug', {
      url: '',
      topics: null,
      news: newsWithConditions,
      topicsToken: false,
      newsToken: newsToken,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextEnquetes
 *
 * マイアンケートの続きを取得
 */
router.post('/getNextEnquetes', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [enquetes, enquetesToken] = await models.questions.myQuestions(Number(req.user.id), perPage, req.query.enquetesToken);

    const enquetesWithConditions = [];
    for(const question of enquetes){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      enquetesWithConditions.push(q);
    }

    return res.render('mypage/top.pug', {
      url: `${req.baseUrl}${req.url}`,
      enquetes: enquetesWithConditions,
      favorites: null,
      enquetesToken: enquetesToken,
      favoritesToken: null,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/getNextFavorites
 *
 * お気に入りアンケートの続きを取得
 */
router.post('/getNextFavorites', async (req, res, next) => {
  try {
    const perPage = config.get('ENQUETES_PER_PAGE');
    const [favorites, favoritesToken] = await models.questions.myFavorites(Number(req.user.id), perPage, req.query.favoritesToken);

    const favoritesWithConditions = [];
    for(const question of favorites){
      const q = await services.setConditions(question, req.cookies[String(question.id)], req.user);
      favoritesWithConditions.push(q);
    }

    return res.render('enquetes/list.pug', {
      url: `${req.baseUrl}${req.url}`,
      enquetes: null,
      favorites: favoritesWithConditions,
      enquetesToken: null,
      favoritesToken: favoritesToken,
      maxItemCount: config.get('MAX_ITEM_COUNT'),
    });
  } catch (e){
    console.log(e);
    return next();
  }
});


/**
 * POST /api/voteTo
 *
 * アンケートに投票
 */
router.post('/voteTo', csrfProtection, async (req, res, next) => {
  try {
    if(req.body.question_id == null || req.body.answer == null) throw new Error('Bad request.');
    if(req.cookies[String(req.body.question_id)]) throw new Error('Have already voted to question: ', req.body.question_id);

    const question = await models.questions.findById(parseInt(req.body.question_id));
    if(services.isExpired(question)) throw new Error('Have already expired: question_id=', req.body.question_id);

    const vote = await services.setVoteValues(req.body);
    const savedData = await models.questions.vote(vote);
    res.cookie(req.body.question_id, '1', {maxAge: 1000*60*60*24*7, httpOnly: true, sameSite: 'Lax'});

    return res.redirect(`/${req.body.question_id}/result`);
  } catch (e){
    console.log(e);
    return next();
  }
});


module.exports = router;
