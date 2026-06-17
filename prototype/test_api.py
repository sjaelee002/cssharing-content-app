import os
from dotenv import load_dotenv
from anthropic import Anthropic


def main():
    load_dotenv()

    api_key = os.getenv("ANTHROPIC_API_KEY")
    model = os.getenv("ANTHROPIC_OUTLINE_MODEL", "claude-haiku-4-5")

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is missing. Check your .env file.")

    client = Anthropic(api_key=api_key)

    response = client.messages.create(
        model=model,
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": "안녕. CS쉐어링 콘텐츠 자동화 앱 API 연결 테스트 중이야. 한 문장으로 응답해줘.",
            }
        ],
    )

    print("Model:", model)
    print("Response:")
    print(response.content[0].text)


if __name__ == "__main__":
    main()