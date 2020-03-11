'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const models = require('./models/model-datastore');

async function refreshVotes(){
  try {
    console.log('Starting refreshVotes().');

    // votesの古いentityを取得
    const votes = await models.votes.readOld();

    const questions = [];
    const answers = [];

    votes.forEach(vote => {
      // question_idごとに得票数をカウント
      if(questions.length === 0 || questions.filter(q => q.id == vote.question_id).length === 0) questions.push({id: Number(vote.question_id), count: 1}); 
      else questions.filter(q => q.id == vote.question_id)[0].count++;

      // answer_idごとに得票数をカウント
      vote.answer_ids.forEach(answer_id => {
        if(answers.length === 0 || answers.filter(a => a.id == answer_id).length === 0) answers.push({id: Number(answer_id), count: 1});
        else answers.filter(a => a.id == answer_id)[0].count++;
      });
    });

    // countを更新するentityをquestionsとanswersそれぞれ取得
    const q_entities = await models.questions.read(questions.map(q => q.id));
    const a_entities = await models.answers.read(answers.map(a => a.id));

    // questions.countの更新、answers.countの更新、votesの削除の3つを同じtransactionで行う
    for(question of q_entities){
      const transaction = await ds.transaction();
      await transaction.run();

      const key = await ds.key(['Questions', ds.int(question.id)]);
      question.count += questions.filter(q => q.id == question.id)[0].count;
      question.id = undefined;

      const entity = {
        key: key,
        data: question
      };
      await transaction.save(question);
      await transaction.save(a_entities.filter(a => a.question_id == question.id).map(answer => {
        const key = ds.key(['Answers', ds.int(answer.id)]);
        answer.count += answers.filter(a => a.id == answer.id)[0].count;
        answer.id = undefined;

        const entity = {
          key: key,
          data: answer
        };
        return entity;
      }));

      await transaction.commit();
      await models.votes._delete(votes.filter(v => v.question_id = question.id).map(vote => vote.id));
      console.log('refreshVotes() succeeded.');

      return;
    }
  } catch (e) {
    console.log(e);
    return;
  }
}

module.exports = {
  refreshVotes: refreshVotes,
};
