const Pet = require("../models/Pet")
const path = require("path")
const express = require('express')
const app = express()



//middleware

// Le o token e separa ele das demais informações
const getToken = require("../helpers/get-token")

//le o token e decodifica ele, pegando os valores que do usuario que foram enviado junto cm a criação do token
const getUserByToken = require("../helpers/get-user-by-token")


//ObjectId
//Vai verificar se o id é um ObjectId válido
const ObjectId = require("mongoose").Types.ObjectId

module.exports = class PetController{

    //create a pet
    static async create(req, res){
        const {name, age, weight, color} = req.body

        let available = true
        const images = req.files

        // images upload

        //validations
        if(!name){
            res.status(422).json({message:" O nome é obrigatorio!!"})
            return
        }

        if(!age){
            res.status(422).json({message:" A idade é obrigatorio!!"})
            return
        }

        if(!weight){
            res.status(422).json({message:" O peso é obrigatorio!!"})
            return
        }

        if(!color){
            res.status(422).json({message:" A cor é obrigatorio!!"})
            return
        }


        if(images.length === 0){
            res.status(422).json({message: "A imagem é obrigátoria"})
            return
        }

        // get pet owner
        const token = getToken(req)
        const user = await getUserByToken(token)
        console.log(user)
        // create a pet
        const  pet = new Pet({
            name,
            age,
            weight,
            color,
            available,
            images: [],
            user: {
                _id: user._id,
               name: user.name,
               image: user.image,
               phone: user.phone,
            },
        })

        images.map((image) => {
            pet.images.push(image.filename)
        })

        try{
            const newPet = await pet.save()
            res.status(201).json({
                message: 'Pet cadastrado com sucesso',
                newPet,
            })
        }catch(err){
            res.status(500).json({message: err})
        }
    }

    static async getAll(req, res){
        const pets = await Pet.find().sort(" -createAt")

        res.status(200).json({pets: pets,})
    }

    static async getAllUserPets(req, res){

        // app.use('/files', express.static(path.resolve(__dirname, "public", "images")))

        const token = getToken(req)
        const user = await getUserByToken(token)

        const pets = await Pet.find({"user._id": user._id}).sort(' -createdAt')


        res.status(200).json({pets: pets})
    }

    static async getAllUserAdoptions(req, res){

        const token = getToken(req)
        const user = await getUserByToken(token)

        const pets = await Pet.find({"adopter._id": user._id}).sort(' -createdAt')

        res.status(200).json({pets})
    }

    static async getPetById(req, res){
        const id = req.params.id

        if(!ObjectId.isValid(id)){
            res.status(422).json({message: "ID inválido"})
            return
        }

        //Pegando todas as informações do  Usuario pelo id
        const pet = await Pet.findOne({ _id: id })

        if(!pet){
            res.status(404).json({message: "pet não encontrado"})
            return
        }

        res.status(200).json({pet: pet})

    }

    static async removePetById(req, res){
        const id = req.params.id

        if(!ObjectId.isValid(id)){
            res.status(422).json({message: "ID inválido"})
            return
        }

        const pet = await Pet.findOne({ _id: id })

        if(!pet){
            res.status(404).json({message: "Pet não encontrado"})
            return
        }

        //vendo se o usuario que cadastrou esse pet pra poder liberar a remoção do pet
        const token = getToken(req)
        const user = await getUserByToken(token)

        console.log(pet.user._id.toString())
        console.log(user._id.toString())

        if(pet.user._id.toString() !== user._id.toString()){
            res.status(422).json({message: "Houve um problema, tente novamente mais tarde!!"})
            return
        }

        await Pet.findByIdAndRemove(id)

        res.status(200).json({message: "Usuário removido com sucesso!!"})

        
    }

    static async updatePet(req, res){
        const id = req.params.id

        const {name, age, weight, color, available} = req.body

        const images = req.files

        const updateData = {}

        //Checando se tem algum pet com esse id
        const pet = await Pet.findOne({ _id: id })

        if(!pet){
            res.status(404).json({message: "Pet não encontrado"})
            return
        }

        //vendo se o usuario que cadastrou esse pet pra poder liberar a remoção do pet
        const token = getToken(req)
        const user = await getUserByToken(token)
  
        // console.log(pet.user._id.toString())
        // console.log(user._id.toString())
  
        if(pet.user._id.toString() !== user._id.toString()){
            res.status(422).json({message: "Houve um problema, tente novamente mais tarde!!"})
            return
        }

        // Validation

        if(!name){
            res.status(422).json({message:" O nome é obrigatorio!!"})
            return
        }else{
            updateData.name = name
        }

        if(!age){
            res.status(422).json({message:" A idade é obrigatorio!!"})
            return
        }else{
            updateData.age = age
        }

        if(!weight){
            res.status(422).json({message:" O peso é obrigatorio!!"})
            return
        }else{
            updateData.weight = weight
        }

        if(!color){
            res.status(422).json({message:" A cor é obrigatorio!!"})
            return
        }else{
            updateData.color = color
        }


        if(images.length > 0){
            updateData.images = []
            images.map((image) => {
                updateData.images.push(image.filename)
            })
        }

        await Pet.findByIdAndUpdate(id, updateData)

        res.status(200).json({message: "Pet atualizado com sucesso!!"})
        
    }

    static async schedule(req, res){
      const id = req.params.id

        // Checando se o usuário existe
        const pet = await Pet.findOne({ _id: id })

        if(!pet){
            res.status(404).json({message: "Pet não encontrado"})
            return
        }

        //vendo se o usuario que cadastrou esse pet não é o mesmo que quer marcar uma consulta para adotalo
        const token = getToken(req)
        const user = await getUserByToken(token)
   
        // console.log(pet.user._id.toString())
        // console.log(user._id.toString())
   
        if(pet.user._id.equals(user._id) ){
            res.status(422).json({message: "Você não pode marcar uma consulta com esse pet, tente novamente mais tarde!!"})
            return
        }

        //checando se o usuário já fez um agendamento antes e negando caso ele já tenha feito
        if(pet.adopter){
            if(pet.adopter._id.equals(user._id)){
                res.status(422).json({message: "Você já agendou uma visita para esse pet"})
                return
            }
        }

        // Adicionando usuário para agendar pet dentro do array de objetos dos pets
        pet.adopter = {
            _id: user._id,
            name: user.name,
            image: user.image
        }

        await Pet.findByIdAndUpdate(id, pet)

        res.status(200).json({message: `A visita foi agendada com sucesso, entre em contato com ${pet.user.name} pelo telefone ${pet.user.phone}`})
    }

    static async concludeAdoption(req, res){
        const id = req.params.id

        // Checando se o usuário existe
        const pet = await Pet.findOne({ _id: id })

        if(!pet){
            res.status(404).json({message: "Pet não encontrado"})
            return
        }

        //vendo se o usuario que cadastrou esse pet pra poder liberar a remoção do pet
        const token = getToken(req)
        const user = await getUserByToken(token)
  
        // console.log(pet.user._id.toString())
        // console.log(user._id.toString())
  
        if(pet.user._id.toString() !== user._id.toString()){
            res.status(422).json({message: "Você não é o dono do pet, tente novamente mais tarde!!"})
            return
        }

        pet.available = false

        await Pet.findByIdAndUpdate(id, pet)

        res.status(200).json({message: "Parabéns o ciclo da adoção foi concluida com sucesso!!"})
    }

}