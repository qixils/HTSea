package dev.qixils.htsea.responses;

public class EmptyResponse extends Response {
	@Override
	public boolean hasData() {
		return false;
	}
}
