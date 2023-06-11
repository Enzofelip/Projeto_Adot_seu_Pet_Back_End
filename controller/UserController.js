const User = require("../models/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

//Helps
const createUserToken = require("../helpers/create-user-token")
const getToken = require("../helpers/get-token")
const getUserByToken = require("../helpers/get-user-by-token")

module.exports = class UserController {
    static async register(req, res){
      const {name, email, phone, password, confipassword} = req.body

      if(!name){
        res.status(422).json({message: 'O nome é obrigatorio'})
        return
      }

      if(!email){
        res.status(422).json({message: 'O email é obrigatorio'})
        return
      }

      if(!phone){
        res.status(422).json({message: 'O telefone é obrigatorio'})
        return
      }

      if(!password){
        res.status(422).json({message: 'A senha é obrigatorio'})
        return
      }

      if(!confipassword){
        res.status(422).json({message: 'A confirmação de senha é obrigatorio'})
        return
      }

      if(password !== confipassword){
        res.status(422).json({message: "A confirmação de senha tem que ser igual a senha"})
        return
      }

      //Check if user exists
      const userExists = await User.findOne({ email: email })

      if(userExists){
        res.status(422).json({message: "Por favor, utilize outro email"})
        return
      }

      // creat a password
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      // create a user
      const user = new User({
        name,
        email,
        phone,
        password: passwordHash,
      })
      

      try{
        const newUser = await user.save()
        
        await createUserToken(newUser, req, res)
      }catch(err){
        res.status(500).json({message: err})
      }
    }

    static async login(req, res){
      const {email, password} = req.body

      if(!email){
        res.status(422).json({message: "O email é obrigatorio"})
        return
      }

      if(!password){
        res.status(422).json({message: "A senha é obrigatoria"})
      }

      //check if user exists
      const user = await User.findOne({ email: email})

      if(!user){
        res.status(422).json({message: "Por favor, utilize outro email"})
        return
      }

      //check if password match with db password
      const checkPassword = await bcrypt.compare(password, user.password)

      if(!checkPassword){
        res.status(422).json({message: "Senha invalda"})
        return
      }

      await createUserToken(user, req, res)
    }

    static async checkUser(req, res){
      let currentUser

      console.log(req.headers.authorization)

      if(req.headers.authorization){
        const token = getToken(req)
        const decoded = jwt.verify(token, 'nossosecret')

        currentUser = await User.findById(decoded.id)

        currentUser.password = undefined
      }else{
        currentUser = null
      }
      console.log(currentUser)
      res.status(200).send(currentUser)
    }

    static async getUserById(req, res){

      const id = req.params.id

      const user = await User.findById(id).select('-password')

      if(!user){
        res.status(422).json({message: "Usuario não encontrado"})
        return
      }

      res.status(200).json(user)
    }

    static async editUser(req, res){
      const id = req.params.id

    //Check if user exists
      const token = getToken(req)
      const user = await getUserByToken(token)


      const {name, email, phone, password, confipassword} = req.body

      if(req.file){
        user.image = req.file.filename
      }

      //Validation
      
      if(!name){
        res.status(422).json({message: 'O nome é obrigatorio'})
        return
      }

      user.name = name

      if(!email){
        res.status(422).json({message: 'O email é obrigatorio'})
        return
      }

      // check if email has already taken
      const userExists = await User.findOne({ email: email})

      if(user.email !== email && userExists){
        res.status(422).json({message: "Email já existente"})
        return
      }

      user.email = email

      if(!phone){
        res.status(422).json({message: 'O telefone é obrigatorio'})
        return
      }

      user.phone = phone

      // if(!password){
      //   res.status(422).json({message: 'A senha é obrigatorio'})
      //   return
      // }

      // if(!confipassword){
      //   res.status(422).json({message: 'A confirmação de senha é obrigatorio'})
      //   return
      // }

      if(password != confipassword){
        res.status(422).json({message: "As senhas não conferem!!"})
        return
      }else if(password === confipassword && password != null){

        //creating password
        const salt = await bcrypt.genSalt(12)
        const passwordHash  = await bcrypt.hash(password, salt)

        user.password = passwordHash
      }

      try{
        // returns user updated data
        await User.findOneAndUpdate({ _id: user._id}, {$set: user}, {new: true})

        res.status(200).json({message: "Usuário atualizado com sucesso!!"})
      }catch(err){
        res.status(500).json({ message: err})
      }
    }
}