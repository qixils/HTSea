package dev.qixils.htsea.responses;

import org.jetbrains.annotations.Nullable;

public abstract class Response {
	public @Nullable String error;

	public boolean hasError() {
		return error != null;
	}

	public abstract boolean hasData();
}
