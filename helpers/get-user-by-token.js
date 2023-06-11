const jwt = require('jsonwebtoken')

const User = require('../models/User')

// get user by jwt token
const getUserByToken = async (token) => {

    if(!token){
        res.status(401).json({message: "Acesso negado!!"})
        return
    }

    const decoded = jwt.verify(token, 'nossosecret')

    const userId = decoded.id

    const user = await User.findOne({ _id: userId})

    return user
}

module.exports = getUserByToken