from flask import Blueprint, jsonify, request

logout_bp = Blueprint("logout", __name__)

# In-memory blacklist
blacklisted_tokens = set()

@logout_bp.route("/logout", methods=["POST"])
def logout():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Authorization header missing"}), 401

    token = auth_header.split(" ")[1]

    # Add token to blacklist immediately
    blacklisted_tokens.add(token)

    return jsonify({"message": "Logged out successfully"}), 200

def is_token_blacklisted(token):
    return token in blacklisted_tokens
