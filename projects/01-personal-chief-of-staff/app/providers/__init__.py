from .anthropic_provider import AnthropicProvider
from .mock_provider import MockProvider
from .openai_provider import OpenAIProvider


def get_provider(name):
    if name == "openai":
        return OpenAIProvider()
    if name == "anthropic":
        return AnthropicProvider()
    return MockProvider()
