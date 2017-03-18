require('dotenv').config()

const {
  APP_PORT = 8080,
  DB_URI = 'localhost/users'
} = process.env

const db = require('monk')(DB_URI)
const users = db.get('users')

const bcrypt = require('bcrypt')

const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')

const app = new Koa()
const router = new Router()

router
  .get('/', hello)
  .get('/users', findAllUsers)
  .get('/users/:id', findUserById)
  .post('/users', insertUser)
  .delete('/users/:id', removeUser)

router.use(['/users', '/users/:id'], auth)

/**
  * TODO Authentication middleware
  */

async function auth (ctx, next) {
  try {
    await next()
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500
    ctx.body = {
      message: err.message
    }
  }
}

async function hello (ctx) {
  ctx.body = 'Hello world'
}

async function findAllUsers (ctx, next) {
  try {
    ctx.body = await users.find({}, '_id name email')
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500
    ctx.body = {
      message: err.message
    }
  }
}

async function findUserById (ctx, next) {
  try {
    const {id} = ctx.params

    ctx.body = await users.find({ _id: id }, '_id name email')
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500
    ctx.body = {
      message: err.message
    }
  }
}

async function insertUser (ctx, next) {
  try {
    const {name, email, password} = ctx.request.body

    const user = await users.find({ email }) // check if email is already taken

    if (user.length) {
      let message = `User email is already taken`
      ctx.body = { message }
      return await next()
    }

    await bcrypt.hash(password, 14) // encrypt user password

    await users.insert({name, email, password})

    // TODO use some service to send email validation

    const message = `New user successfully created, check your email`

    ctx.body = { message }
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500
    ctx.body = {
      message: err.message
    }
  }
}

async function removeUser (ctx, next) {
  try {
    const { id } = ctx.params

    await users.remove({ _id: id })

    const message = `User ${id} successfully deleted`

    ctx.body = { message }
  } catch (err) {
    ctx.status = err.statusCode || err.status || 500
    ctx.body = {
      message: err.message
    }
  }
}

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(APP_PORT, (err) => {
  if (err) throw err
  console.log(`Users microservice listening on port ${APP_PORT}`)
})
