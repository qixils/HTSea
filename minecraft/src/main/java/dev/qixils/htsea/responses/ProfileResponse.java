package dev.qixils.htsea.responses;

import org.jetbrains.annotations.Nullable;

public class ProfileResponse extends Response {
	private @Nullable Double diamonds;

	@Override
	public boolean hasData() {
		return diamonds != null;
	}

	/**
	 * Get the amount of diamonds the player has in their wallet.
	 *
	 * @return amount of diamonds
	 * @throws NullPointerException if {@code hasData()} returns {@code false}
	 */
	public double getDiamonds() throws NullPointerException {
		return diamonds;
	}
}
