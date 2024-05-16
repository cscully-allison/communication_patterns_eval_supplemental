# Requirements

Running the experiment platform will require that you have `python` installed on your system.

# Installing the Platform

Execute the following commands to install experiment platform dependencies:

```
pip install --user -r requirements.txt
```

# Running the Platform 

To start the platform server and run the platform please enter the following command:

```
python application.py 
```

A flask server should start up with the following lines:

```
 * Serving Flask app "application" (lazy loading)
 * Environment: production
   WARNING: This is a development server. Do not use it in a production deployment.
   Use a production WSGI server instead.
 * Debug mode: off
 * Running on http://0.0.0.0:5000/ (Press CTRL+C to quit)
 ```

 After this, open your web browser, and naviagate to `localhost:5000/demographics`

 # Alternatively

 Please feel free to navigate to `https://dry-beyond-38655.herokuapp.com/demographics` if you want to experience the experiment platform without starting your own server.
 Note: It may take approximately a minute to load if the web page was not recently used so do not worry that it has timed out.