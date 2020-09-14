import { schema, use } from "nexus";
import { prisma } from "nexus-plugin-prisma";
import { stringArg, intArg } from '@nexus/schema'
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import cookie from "cookie"
import axios from "axios"

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function fetchResponseFromOpenAI(exampleBlog, exampleTitle, title) {
  const url = "https://api.openai.com/v1/engines/davinci/completions";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_SECRET}`,
  };

  const prompt = "The following are blog posts.\nBLOG 1\n~~~\n" + exampleTitle + "\n\n" + exampleBlog + "\n~~~\nBLOG 2\n~~~\n" + title

  //   if (!prompt) return res.json({ error: "No prompt provided." });

  const body = {
    prompt: prompt,
    max_tokens: 1000,
    temperature: 0.8,
		frequency_penalty: .3,
		presence_penalty:.1,
    // top_p: 1,
    // n: 1,
    // stream: false,
    // logprobs: null,
    // stop: "\n",
  };
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
  const json: {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
      text: string;
      index: number;
      logprobs: null;
      finish_reason: string;
    }[];
  } = await response.json();
  console.log(json.choices, json);
  return json;

}


function validatePassword(user, password) {
  return bcrypt.compareSync(password, user.password);
}

schema.objectType({
  name: "user",
  definition(t) {
    t.model.id();
		t.model.first_name();
		t.model.last_name();
		t.model.email();
		t.model.password();
		t.model.created_at();
		t.model.updated_at();
  },
});

schema.objectType({
  name: "document",
  definition(t) {
    t.model.id();
		t.model.generated_blog_text();
		t.model.title();
		t.model.example_blog_text();
		t.model.example_title();
		t.model.worker_job_id();
		t.model.created_at();
		t.model.updated_at();
  },
});

type TokenData = {
	id: number;
	email: string;
};

function getUserToken(ctx): TokenData {
	const { token } = cookie.parse(ctx.req.headers.cookie ?? "");

	if (token) {
			const { id, email } = jwt.verify(token, process.env.ENV_LOCAL_JWT_SECRET);
			return { id, email }
		} else {
		throw Error("does not have token")
	}
}

function validateServiceToken(ctx) {
	const token = ctx.req.headers.authorization;

	if (token) {
			const { message } = jwt.verify(token, process.env.ENV_LOCAL_JWT_SECRET);
			if (message != process.env.ENV_LOCAL_JWT_MESSAGE) {
				throw Error("invalid token message")
			}
		} else {
		throw Error("no token provided")
	}
}

schema.queryType({
  definition(t) {
    t.list.field("allUsers", {
      type: "user",
      resolve(_parent, _args, ctx) {
        return ctx.db.user.findMany();
      },
		});
		t.field("user", {
			type: "user",
			args: {},
      async resolve(_parent, _args, ctx) {
				const {id, email} = getUserToken(ctx)
				return await ctx.db.user.findOne({ where: { id } });
			},
		});
		t.field("document", {
			type: "document",
			args: { 
				worker_job_id: stringArg({ nullable: false }),
			},
      async resolve(_parent, _args, ctx) {
				const { worker_job_id } = _args
				const {id, email} = getUserToken(ctx)
				return await ctx.db.document.findOne({ where: { worker_job_id } });
			},
		});
  },
});
 
schema.mutationType({
  definition(t) {
		t.field("signup", {
			type: "user",
			args: {
				email: stringArg({ nullable: false }),
				password: stringArg({ nullable: false }),
				first_name: stringArg({ nullable: false}),
				last_name: stringArg({ nullable: false}),
				inviteCode: stringArg({ nullable: false})
			},
			async resolve(_parent, _args, ctx) {
				const { first_name, last_name, password, email, inviteCode } = _args

				if (inviteCode !== process.env.ENV_LOCAL_INVITE_SECRET) {
					throw Error("Invalid invite code")
				}
				const salt =bcrypt.genSaltSync();

				const user = await ctx.db.user.create({
					data: {
						email: email,
						first_name: first_name,
						last_name: last_name,
						password: bcrypt.hashSync(password, salt),
					},
				});
				const token = jwt.sign(
					{ email: user.email, id: user.id, time: new Date() },
					process.env.ENV_LOCAL_JWT_SECRET,
					{
						expiresIn: "6h",
					}
				);

				const token2 = jwt.sign(
					{ message: process.env.ENV_LOCAL_JWT_MESSAGE },
					process.env.ENV_LOCAL_JWT_SECRET,
					{
						expiresIn: "6h",
					}
				);

				ctx.res.setHeader(
					"Set-Cookie",
					cookie.serialize("token", token, {
						httpOnly: true,
						maxAge: 6 * 60 * 60,
						path: "/",
						sameSite: "lax",
						secure: process.env.NODE_ENV === "production",
					})
				);

				return user
			}
		})
		t.field("login", {
			type: "user",
			args: {
				email: stringArg({ nullable: false }),
				password: stringArg({ nullable: false }),
			},
			async resolve(_parent, _args, ctx) {
				const { email, password } = _args
				const salt = bcrypt.genSaltSync();

				const user = await ctx.db.user.findOne({
					where: {
						email: email
					}
				});
				if (user && validatePassword(user, password)) {
					const token = jwt.sign(
						{ email: user.email, id: user.id, time: new Date() },
						process.env.ENV_LOCAL_JWT_SECRET,
						{
							expiresIn: "6h",
						}
					);
	
					ctx.res.setHeader(
						"Set-Cookie",
						cookie.serialize("token", token, {
							httpOnly: true,
							maxAge: 6 * 60 * 60,
							path: "/",
							sameSite: "lax",
							secure: process.env.NODE_ENV === "production",
						})
					);
	
					return user
				}
				throw new Error("Invalid email and password combination");
    	}
		})
		t.field("createDocument", {
			type: "document",
			args: {
				title: stringArg({ nullable: false }),
				example_blog_text: stringArg({ nullable: false }),
				example_title: stringArg({ nullable: false }),
			},
			async resolve(_parent, _args, ctx) {
				const { title, example_blog_text, example_title } = _args
				const {id, email} = getUserToken(ctx)
				const token = jwt.sign(
					{ message: process.env.ENV_LOCAL_JWT_MESSAGE },
					process.env.ENV_LOCAL_JWT_SECRET,
					{
						expiresIn: "1h",
					}
				);

				// axios.defaults.headers.common['Authorization'] = token;
				// const res = await axios.post(process.env.ENV_LOCAL_PYTHON_URL, {
				// 	title,
				// 	example_title,
				// 	example_blog: example_blog_text
				// })
				const res = await fetchResponseFromOpenAI(example_blog_text, example_title, title)
				console.log("Herer creating ...:user iD", id)
				// const job_id = res.data.job_id
				return ctx.db.document.create({
					data: {
						title: title,
						example_blog_text: example_blog_text,
						example_title: example_title,
						user: {
							connect: {
								 id
							}
						},
						worker_job_id: uuidv4(),
						generated_blog_text: res.choices[0].text
					},
				});
    	}
		})
		t.field("fetchOrUpdateBlog", {
			type: "document",
			args: { 
				worker_job_id: stringArg({ nullable: false }),
			},
      async resolve(_parent, _args, ctx) {
				const { worker_job_id } = _args
				const {id, email} = getUserToken(ctx)
				const document = await ctx.db.document.findOne({ where: { worker_job_id } });
				if (document.generated_blog_text !== "") {
					return document
				} 

				console.log("heererere")
				const token = jwt.sign(
					{ message: process.env.ENV_LOCAL_JWT_MESSAGE },
					process.env.ENV_LOCAL_JWT_SECRET,
					{
						expiresIn: "1h",
					}
				);
				console.log("heererere22")

				axios.defaults.headers.common['Authorization'] = token;
				try {
					const res = await axios.get(process.env.ENV_LOCAL_PYTHON_URL + document.worker_job_id)
					const generatedText = res.data.blog
					return  ctx.db.document.update({ 
						data:  { generated_blog_text: generatedText },
						where: { worker_job_id }
					});
					// const response = await fetchResponseFromOpenAI()
				} catch (err) {
					console.log("heererere33", err)
					throw Error(err)
				}
			},
		});
		t.field("updateDocument", {
			type: "document",
			args: {
				document_id: intArg({ nullable: false }),
				generated_blog_text: stringArg({ nullable: false }),
			},
			async resolve(_parent, _args, ctx) {
				const { generated_blog_text, document_id } = _args
				validateServiceToken(ctx)

				return ctx.db.document.update({
					where : {
						id: document_id
					},
					data: {
						generated_blog_text: generated_blog_text
					},
				});
    	}
		})
  },
});

use(prisma({ features: { crud: true } }));