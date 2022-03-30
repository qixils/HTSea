package dev.qixils.htsea.responses;

import org.jetbrains.annotations.Nullable;

public class SecretResponse extends Response {
	public @Nullable String secret;

	@Override
	public boolean hasData() {
		return secret != null;
	}
}
