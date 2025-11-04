from flask import Flask, jsonify, render_template
import random

app = Flask(__name__)

# API trả về màu ngẫu nhiên
@app.route('/api/random_color')
def random_color():
    color = "#{:06x}".format(random.randint(0, 0xFFFFFF))
    return jsonify({"color": color})

# Trang HTML frontend
@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
