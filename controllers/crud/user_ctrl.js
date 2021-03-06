"use strict";

const userModel = require('../../models/user'),
    communityModel = require('../../models/community'),
    hash = require('../../services/hash');

const user = new userModel.UserActions();
const community = new communityModel.CommunityActions();

const emailRegex = /^[-\w.%+]{1,64}@(?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63}$/i

class UserCtrl
{
    signupUser(req,res)
    {
        let newUser= new userModel.user(
        {
            email : req.body.email,
            nick : req.body.nick,
            name : req.body.name,
            second_name : req.body.second_name || '',
            last_name : req.body.last_name,
            second_last_name: req.body.second_last_name || '',
            password : req.body.password,
            gender: req.body.gender,
            avatar: req.body.avatar || '',
            lastLogin: Date.now()
        });

        if((newUser.email).includes (' ') ||
            (newUser.nick).includes (' ') ||
            (newUser.gender).includes (' ') ||
            (newUser.avatar).includes (' ') ||
            !emailRegex.test(newUser.email)
        ) return res.status(400).send({error:"Formating error"});
        
        user.registerUser(newUser, (ok, msg) =>
        {
            if(ok) return res.status(200).send({message:msg.message, token: hash.createToken(newUser)});
            return res.status(400).send(msg);
        });
    }
    
    signupUserCommunity(req,res)
    {
        if((req.body.nick || req.body.email) && (req.body.name || req.body.inv_token))
        {
            user.getUser({$or:[{email:req.body.email},{nick:req.body.nick}]}, (ok,msgUser)=>
            {
                if(ok)
                {
                    community.getCommunity({$or:[{inv_token:req.body.inv_token},{name:req.body.name}]},(ok,msgCommunity)=>
                    {
                        if(ok)
                        { 
                            if((msgCommunity.users.indexOf(msgUser._id)) < 0)
                            {
                                switch(msgCommunity.privacy)
                                {
                                    //{$set:{'users.$.user_id':msgUser._id}}
                                    case "OPEN":
                                    {
                                        community.registerUser({$or:[{name:msgCommunity.name},{inv_token:msgCommunity.inv_token}]}, {"$addToSet":{users:msgUser._id}},(ok,obj)=>
                                        {
                                            if(ok) return res.status(200).send({message:"User added to community"});
                                            return res.status(500).send({error:obj});
                                        });
                                    }break;
                                    
                                    case "PUBLIC":
                                    {
                                        community.registerRequest({$or:[{name:msgCommunity.name},{inv_token:msgCommunity.inv_token}]}, {"$addToSet":{requests:msgUser._id}},(ok,obj)=>
                                        {
                                                if(ok) return res.status(200).send({message:"Request sent"});
                                                return res.status(500).send({error:obj});
                                        });
                                    }break;
                                    
                                    case "PRIVATE":
                                    {
                                    if(req.body.inv_token && req.body.inv_token===msgCommunity.inv_token)
                                    {
                                        community.registerRequest({$or:[{name:msgCommunity.name},{inv_token:msgCommunity.inv_token}]}, {"$addToSet":{requests:msgUser._id}},(ok,obj)=>
                                        {
                                            if(ok) return res.status(200).send({message:"Request sent"});
                                            return res.status(500).send({error:obj});
                                        });

                                    } else res.status(400).send({message:"Need an invitation token"});
                                    }break;
                                }
                            }else return res.status(200).send({message:"User is already a member"});
                        }else return res.status(404).send({message:"Community doesn't exist"});
                    });
                } else return res.status(404).send({message:"User doesn't exist"});
            });
        } else return res.status(400).send({message:'Need a correct request body'});

    }
    
    loginUser(req,res,next)
    {
        if((req.body.nick || req.body.email) && req.body.password)
        {
            user.passUser(req.body, (ok,msg) =>
            {
                if(ok)
                {
                    req.user = msg;
                    let token = hash.createToken(msg);
                    return res.status(200).send({info: "Logged  "+ msg.email, token: token});
                    
                }else return res.status(400).send({info: msg});
            });
        }else return res.status(400).send({error:"Need to provide a correct request body"});
    }
    
    updateUser(req, res)
    {        
        user.getUser({email: req.body.email}, (ok, msgUser) =>
        {
            if(ok)
            {
                if((msgUser.email).includes(req.user.email) || (msgUser.nick).includes(req.user.nick))
                {
                    let newUser =
                    {
                        email : req.body.email,
                        nick : req.body.nick,
                        name : req.body.name,
                        second_name : req.body.second_name,
                        last_name : req.body.last_name,
                        second_last_name: req.body.second_last_name,
                        password : req.body.password,
                        gender : req.body.password,
                        avatar : req.body.password,
                    };

                    msgUser.update({email: newUser.email,
                        nick: newUser.nick,
                        name: newUser.name,
                        second_name: newUser.second_name,
                        last_name: newUser.last_name,
                        second_last_name: newUser.second_last_name,
                        password: newUser.password,
                        gender: newUser.gender,
                        avatar: newUser.avatar}, (ok, obj) =>
                    {
                        if(ok) return res.status(200).send({message:"user updated"});
                        return res.status(500).send({error:obj});
                    })

                } else res.status(500).send({message: "Error to update User"});
            }
        })
    }
}

module.exports = UserCtrl;
