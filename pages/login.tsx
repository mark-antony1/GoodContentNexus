import Layout from '../components/Layout'
import Link from 'next/link'
import Button from '@material-ui/core/Button';
import React, { useState} from "react";
import FormInputField from '../components/FormInputField'
import { useMutation } from "urql";
import gql from "graphql-tag";
import { useRouter } from 'next/router'
import CircularProgress from '@material-ui/core/CircularProgress';

const Login = gql`
  mutation ($email: String!, $password: String!)  {
    login(email: $email, password: $password) {
			id
			first_name
    }
	}`;
	
const LoginPage = () => {
	const router = useRouter()
	const [loginResult, login] = useMutation(Login);
	const [formFields, setFormFields] = useState({
		email: "",
		password: "",
	})
	const [errorText, setErrorText] = useState("")

	const updateFormFields = (value, field) => {
		let newFormFields = Object.assign({}, formFields)
		newFormFields[field] = value
		setFormFields(newFormFields)
	}

	const handleSubmit = () => {
		login(formFields)
		.then(res => {
			if (res.error && res.error.message){
				const message = res.error.message
				if (message.includes("Invalid email and passwo")){
					setErrorText("Invalid email and password combination")
				} else if (message.includes("ique constraint failed on the fields: (`email")){
					setErrorText("That email has already been used")
				} else if (message.includes("variable not found: DATABASE_URL")) {
					setErrorText("Server Error: Missing Database Connection")
				} else if (message.includes("secretOrPrivateKey must have a value")) {
					setErrorText("Server Error: Missing Server Side Variables")
				} else if (message.includes("The URL for datasource `db`")) {
					setErrorText("Server Error: Invalid Database Connection")
				} else {
					setErrorText("An error has occured please try again later")
				} 
			} else {
				window.location.href = window.location.origin
			}
		})
	}

  return(
		<Layout title="Login | Goodcontent.ai">
			<div className='card-container'>
				<div className='card'>
					<h1>Log In</h1>
					<Link href="/signup">
						<a>Need to sign up?</a>
					</Link>
					<FormInputField label={'Email*'} value={formFields.email} 
						onChange={(e) => updateFormFields(e.target.value, 'email')}/>
					<FormInputField label={'Password*'} value={formFields.password} 
						onChange={(e) => updateFormFields(e.target.value, 'password')}/>
					<Button style={{minWidth: '120px', minHeight: "39px"}} onClick={handleSubmit} disableElevation variant="contained" color="primary">
						{loginResult.fetching ? <CircularProgress color="inherit" size='26px'/> : "Log In"}
					</Button>
					<p style={{color: 'red', fontWeight: 'bold'}}>{errorText}</p>
				</div>
			</div>
  	</Layout>
	)
}

export default LoginPage
