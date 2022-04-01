package dev.qixils.htsea.responses;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.jetbrains.annotations.Range;

public class ProfileResponse extends Response {
	private @Nullable Double diamonds;
	private @Nullable String name;
	private @Nullable @Range(from=1L, to=9999L) Integer discriminator;

	@Override
	public boolean hasData() {
		return diamonds != null;
	}

	/**
	 * Get the amount of diamonds the player has in their wallet.
	 *
	 * @return amount of diamonds
	 * @throws IllegalStateException if {@code hasData()} returns {@code false}
	 */
	public double getDiamonds() throws IllegalStateException {
		if (diamonds == null)
			throw new IllegalStateException("No data available. `#hasData()` should be checked before calling this method.");
		return diamonds;
	}

	/**
	 * Gets the user's name on Discord.
	 *
	 * @return Discord name
	 * @throws IllegalStateException if {@code hasData()} returns {@code false}
	 */
	public @NotNull String getName() throws IllegalStateException {
		if (name == null)
			throw new IllegalStateException("No data available. `#hasData()` should be checked before calling this method.");
		return name;
	}

	/**
	 * Gets the user's discriminator on Discord.
	 *
	 * @return Discord discriminator
	 * @throws IllegalStateException if {@code hasData()} returns {@code false}
	 */
	public @Range(from=1L, to=9999L) int getDiscriminator() throws IllegalStateException {
		if (discriminator == null)
			throw new IllegalStateException("No data available. `#hasData()` should be checked before calling this method.");
		return discriminator;
	}

	/**
	 * Gets the user's discriminator on Discord formatted as a zero-padded string.
	 * The hash symbol is omitted.
	 *
	 * @return Discord discriminator as a zero-padded string
	 * @throws IllegalStateException if {@code hasData()} returns {@code false}
	 */
	public String getDiscriminatorString() throws IllegalStateException {
		return String.format("%04d", getDiscriminator());
	}
}
